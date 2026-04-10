'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { CalibrationModeViewProps } from '../types';
import { getCalibrationAudio } from '../../../lib/calibration-audio';
import { drawStickman, drawBone, type StickmanPose } from './stickman-renderer';
import {
  type Particle,
  type Bone,
  type SpeedLine,
  createExplosion,
  createHitSparks,
  createObstacleDebris,
  createLandingDust,
  drawAndUpdateParticles,
  updateBones,
  drawAndUpdateSpeedLines,
} from './particle-system';

/**
 * Stickman Canvas — Gamified calibration mode.
 *
 * Phase flow:
 *   1. sequence  → Stickman moves through waypoints (dash/jump/walk)
 *   2. collecting → Idle; gaze fills scan ring over SCAN_DURATION_MS
 *   3. shattered → Explosion with bone physics
 *   4. waiting   → Next point trigger
 *
 * Rendering and physics extracted into:
 *   - stickman-renderer.ts (figure drawing)
 *   - particle-system.ts   (particles, bones, speed lines)
 */

export interface StickmanCanvasProps extends CalibrationModeViewProps {
  gazeX: number;
  gazeY: number;
  onSampleCollected?: () => void;
}

type GamePhase = 'sequence' | 'collecting' | 'shattered' | 'waiting';

interface Waypoint {
  x: number;
  y: number;
  duration: number;
  type: 'dash' | 'jump' | 'fall' | 'walk';
  pause?: number;
  arc?: number;
  pose?: StickmanPose;
  impact?: boolean;
  obstacle?: { x: number; y: number; active: boolean };
}

// Timing constants
const SCAN_DURATION_MS = 2200;
const HIT_COOLDOWN_MS = 350;
const SHATTER_DISPLAY_MS = 2000;
const STICKMAN_SPEED_FACTOR = 1.85;

export function StickmanCanvas({
  currentPoint,
  collectionStep,
  collectionTotal,
  isBossPoint,
  fixationProgress,
  isStableFixation,
  gazeX,
  gazeY,
  onSampleCollected,
}: StickmanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gazeRef = useRef({ x: gazeX, y: gazeY });
  const lastRenderTimeRef = useRef(0);
  const pointKeyRef = useRef(`${currentPoint.x}-${currentPoint.y}-${collectionStep}`);
  const renderRef = useRef<((time: number) => void) | null>(null);

  // Game state refs (mutable, not reactive)
  const gameRef = useRef<{
    phase: GamePhase;
    waypoints: Waypoint[];
    currentWpIndex: number;
    wpStartTime: number;
    startX: number;
    startY: number;
    stickX: number;
    stickY: number;
    stickAngle: number;
    pose: StickmanPose;
    facingRight: boolean;
    scanProgress: number;
    screenShake: number;
    lastHitTime: number;
    phaseStartTime: number;
    particles: Particle[];
    bones: Bone[];
    speedLines: SpeedLine[];
    lastStepTime: number;
    sampleCollectedForThisPoint: boolean;
    width: number;
    height: number;
    dpr: number;
  } | null>(null);

  useEffect(() => {
    gazeRef.current = { x: gazeX, y: gazeY };
  }, [gazeX, gazeY]);

  const audio = useMemo(() => getCalibrationAudio(), []);

  /* ── Path generation ─────────────────────────────────── */

  const generatePath = useCallback(
    (
      targetX: number,
      targetY: number,
      width: number,
      height: number,
      isBoss: boolean,
    ): { waypoints: Waypoint[]; startX: number; startY: number } => {
      const pace = (ms: number) => Math.round(ms * STICKMAN_SPEED_FACTOR);

      if (isBoss) {
        return {
          startX: width / 2,
          startY: -200,
          waypoints: [
            { x: width / 2, y: height / 2, duration: pace(400), type: 'fall', impact: true },
            { x: width * 0.2, y: height * 0.8, duration: pace(250), pause: pace(200), type: 'dash' },
            { x: width * 0.8, y: height * 0.2, duration: pace(250), pause: pace(200), type: 'dash' },
            { x: targetX, y: targetY, duration: pace(450), type: 'jump', arc: 200, pose: 'proud', impact: true },
          ],
        };
      }

      // Minion: spawn from random edge
      const edge = Math.floor(Math.random() * 4);
      let startX: number, startY: number;
      if (edge === 0) { startX = Math.random() * width; startY = -50; }
      else if (edge === 1) { startX = width + 50; startY = Math.random() * height; }
      else if (edge === 2) { startX = Math.random() * width; startY = height + 50; }
      else { startX = -50; startY = Math.random() * height; }

      const pts = [{ x: startX, y: startY }];
      for (let i = 0; i < 2; i++) {
        pts.push({ x: width * 0.15 + Math.random() * 0.7 * width, y: height * 0.15 + Math.random() * 0.7 * height });
      }
      const approachDir = targetX > pts[pts.length - 1].x ? -1 : 1;
      pts.push({ x: targetX + approachDir * 100, y: targetY });
      pts.push({ x: targetX, y: targetY });

      const waypoints: Waypoint[] = [];
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        if (i === pts.length - 1) {
          waypoints.push({ x: curr.x, y: curr.y, duration: pace(900), type: 'walk', pose: 'idle' });
        } else {
          const isObstacleJump = Math.random() > 0.4;
          if (isObstacleJump) {
            const obsX = (prev.x + curr.x) / 2;
            const obsY = (prev.y + curr.y) / 2;
            waypoints.push({
              x: curr.x, y: curr.y, duration: pace(450), pause: pace(120),
              type: 'jump', arc: 120, obstacle: { x: obsX, y: obsY, active: true }, impact: true,
            });
          } else {
            waypoints.push({ x: curr.x, y: curr.y, duration: pace(300), pause: pace(170), type: 'dash', impact: false });
          }
        }
      }
      return { waypoints, startX, startY };
    },
    [],
  );

  /* ── Game init ───────────────────────────────────────── */

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const targetX = currentPoint.x * width;
    const targetY = currentPoint.y * height;

    const { waypoints, startX, startY } = generatePath(targetX, targetY, width, height, isBossPoint);

    gameRef.current = {
      phase: 'sequence', waypoints, currentWpIndex: 0, wpStartTime: performance.now(),
      startX, startY, stickX: startX, stickY: startY, stickAngle: 0,
      pose: 'idle', facingRight: true, scanProgress: 0, screenShake: 0,
      lastHitTime: 0, phaseStartTime: performance.now(),
      particles: [], bones: [], speedLines: [], lastStepTime: 0,
      sampleCollectedForThisPoint: false, width, height, dpr,
    };

    if (isBossPoint) audio.play('bossSpawn');
    else audio.play('spawn');
  }, [currentPoint, isBossPoint, audio, generatePath]);

  /* ── Render loop ─────────────────────────────────────── */

  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      if (!canvas || !game) {
        animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }

      const deltaMs = lastRenderTimeRef.current ? time - lastRenderTimeRef.current : 16;
      lastRenderTimeRef.current = time;

      const { width, height, dpr } = game;
      const gaze = gazeRef.current;
      const hitRadius = isBossPoint ? 70 : 35;
      const scale = isBossPoint ? 0.9 : 0.4;

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = 0; y < height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();

      // Screen shake
      ctx.save();
      if (game.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * game.screenShake, (Math.random() - 0.5) * game.screenShake);
        game.screenShake *= 0.85;
        if (game.screenShake < 0.5) game.screenShake = 0;
      }

      const mouseDist = Math.hypot(game.stickX - gaze.x, game.stickY - gaze.y);

      /* -- PHASE: SEQUENCE (movement) -- */
      if (game.phase === 'sequence') {
        const wp = game.waypoints[game.currentWpIndex];
        if (!wp) {
          game.phase = 'collecting';
          game.phaseStartTime = time;
        } else {
          const elapsed = time - game.wpStartTime;

          if (elapsed < wp.duration) {
            const t = elapsed / wp.duration;
            if (wp.x > game.startX) game.facingRight = true;
            else if (wp.x < game.startX) game.facingRight = false;
            game.stickAngle = Math.atan2(wp.y - game.startY, wp.x - game.startX);

            if (wp.type === 'jump') {
              game.pose = 'jump';
              if (t < 0.02) audio.play('jump');
              const arcY = Math.sin(t * Math.PI) * (wp.arc || 120);
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * t - arcY;
              if (wp.obstacle && wp.obstacle.active && t >= 0.5) {
                wp.obstacle.active = false;
                audio.play('obstacleBreak');
                game.screenShake = 10;
                game.particles.push(...createObstacleDebris(wp.obstacle.x, wp.obstacle.y));
              }
            } else if (wp.type === 'fall') {
              game.pose = 'fall';
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * (t * t);
            } else if (wp.type === 'walk') {
              game.pose = 'walk';
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * t;
              if (time - game.lastStepTime > 300) { audio.play('step'); game.lastStepTime = time; }
            } else {
              game.pose = 'sprint';
              if (t < 0.02) audio.play('dash');
              const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              game.stickX = game.startX + (wp.x - game.startX) * easeT;
              game.stickY = game.startY + (wp.y - game.startY) * easeT;
              if (Math.random() > 0.4) {
                game.speedLines.push({
                  x: game.stickX + (Math.random() - 0.5) * 60,
                  y: game.stickY + (Math.random() - 0.5) * 60,
                  angle: game.stickAngle, length: 30 + Math.random() * 50, life: 100,
                });
              }
            }
          } else {
            game.stickX = wp.x;
            game.stickY = wp.y;
            game.pose = wp.pose || 'idle';
            const justReached = elapsed - wp.duration < 20;
            if (justReached) {
              if (wp.type === 'dash') audio.play('skid');
              if (wp.impact) {
                game.screenShake = isBossPoint ? 30 : 8;
                if (isBossPoint) audio.play('bossLand'); else audio.play('land');
                game.particles.push(...createLandingDust(game.stickX, game.stickY));
              }
            }
            if (elapsed > wp.duration + (wp.pause || 0)) {
              if (game.currentWpIndex >= game.waypoints.length - 1) {
                game.phase = 'collecting';
                game.phaseStartTime = time;
              } else {
                game.startX = wp.x;
                game.startY = wp.y;
                game.currentWpIndex++;
                game.wpStartTime = time;
              }
            }
          }

          // Hit sparks during movement
          const feedbackHitActive = mouseDist < hitRadius * 2 || isStableFixation || fixationProgress > 0.35;
          if (feedbackHitActive && time - game.lastHitTime > HIT_COOLDOWN_MS) {
            audio.play('hit');
            game.lastHitTime = time;
            game.particles.push(...createHitSparks(game.stickX, game.stickY));
          }
        }
      }

      /* -- PHASE: COLLECTING (fixation) -- */
      if (game.phase === 'collecting') {
        const hasStableLock = isStableFixation || mouseDist < hitRadius;
        if (hasStableLock) {
          game.scanProgress += deltaMs / SCAN_DURATION_MS;
          const tickStep = Math.floor(game.scanProgress * 10);
          const prevTickStep = Math.floor((game.scanProgress - deltaMs / SCAN_DURATION_MS) * 10);
          if (tickStep !== prevTickStep && game.scanProgress < 1) {
            audio.play('scanTick', { progress: game.scanProgress });
          }
          if (game.scanProgress >= 1 && !game.sampleCollectedForThisPoint) {
            game.phase = 'shattered';
            game.phaseStartTime = time;
            game.sampleCollectedForThisPoint = true;
            audio.play('shatter');
            game.screenShake = 40;
            const { particles, bones } = createExplosion(game.stickX, game.stickY);
            game.particles.push(...particles);
            game.bones.push(...bones);
            onSampleCollected?.();
          }
        } else {
          game.scanProgress = Math.max(0, game.scanProgress - deltaMs / 650);
        }
      }

      /* -- PHASE: SHATTERED -- */
      if (game.phase === 'shattered') {
        const shatterElapsed = time - game.phaseStartTime;
        if (shatterElapsed < 250) {
          const flashAlpha = Math.max(0, 0.6 * (1 - shatterElapsed / 250));
          ctx.save();
          ctx.globalAlpha = flashAlpha;
          ctx.fillStyle = isBossPoint ? '#fef08a' : '#ffffff';
          ctx.fillRect(0, 0, game.width, game.height);
          ctx.restore();
        }
        if (shatterElapsed > SHATTER_DISPLAY_MS) game.phase = 'waiting';
      }

      /* -- Draw obstacle -- */
      if (game.phase === 'sequence') {
        const currentWp = game.waypoints[game.currentWpIndex];
        if (currentWp?.obstacle?.active) {
          ctx.save();
          ctx.translate(currentWp.obstacle.x, currentWp.obstacle.y);
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(-15, 10); ctx.lineTo(0, -30); ctx.lineTo(15, 10); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-5, -10); ctx.lineTo(0, -30); ctx.lineTo(5, -10); ctx.stroke();
          ctx.restore();
        }
      }

      /* -- Draw speed lines, stickman, particles, bones -- */
      drawAndUpdateSpeedLines(ctx, game.speedLines, deltaMs);

      if (game.phase !== 'shattered' && game.phase !== 'waiting') {
        drawStickman(ctx, game.stickX, game.stickY, time, game.pose, game.facingRight, isBossPoint);

        // Scan ring during collecting
        if (game.phase === 'collecting') {
          ctx.save();
          ctx.translate(game.stickX, game.stickY);
          if (isBossPoint) {
            ctx.rotate(time * 0.002);
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
              const a = (i * Math.PI) / 3;
              const r = hitRadius + Math.random() * 4;
              if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            const red = 255;
            const green = Math.floor(game.scanProgress * 255);
            const blue = Math.floor(game.scanProgress * 255);
            ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, 0.8)`;
            ctx.lineWidth = 4 + game.scanProgress * 8;
            ctx.stroke();
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.1 + game.scanProgress * 0.3})`;
            ctx.fill();
          } else {
            ctx.rotate(-Math.PI / 2);
            ctx.beginPath();
            ctx.arc(0, 0, hitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 3;
            ctx.stroke();
            if (game.scanProgress > 0) {
              ctx.beginPath();
              ctx.arc(0, 0, hitRadius, 0, Math.PI * 2 * game.scanProgress);
              ctx.strokeStyle = '#3b82f6';
              ctx.lineCap = 'round';
              ctx.lineWidth = 6;
              ctx.stroke();
            }
          }
          ctx.restore();

          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = isBossPoint ? '#ef4444' : '#2563eb';
          ctx.globalAlpha = 0.5 + Math.sin(time * 0.01) * 0.5;
          ctx.fillText(isBossPoint ? 'OVERLOAD!' : 'FIXATE', game.stickX, game.stickY + hitRadius + 20);
          ctx.globalAlpha = 1;
        }
      }

      drawAndUpdateParticles(ctx, game.particles, deltaMs);

      // Bones
      ctx.strokeStyle = isBossPoint ? '#dc2626' : '#000000';
      ctx.lineWidth = 8 * scale;
      ctx.lineCap = 'round';
      for (const b of game.bones) {
        drawBone(ctx, b, scale, isBossPoint);
      }
      updateBones(game.bones, deltaMs);

      ctx.restore(); // Restore from screen shake
      animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    },
    [isBossPoint, fixationProgress, isStableFixation, audio, onSampleCollected],
  );

  // Keep render ref up to date
  useEffect(() => { renderRef.current = render; }, [render]);

  // Handle point change
  useEffect(() => {
    const newKey = `${currentPoint.x}-${currentPoint.y}-${collectionStep}`;
    if (newKey !== pointKeyRef.current) {
      pointKeyRef.current = newKey;
      initGame();
    }
  }, [currentPoint, collectionStep, initGame]);

  // Setup canvas and animation loop
  useEffect(() => {
    initGame();
    const handleResize = () => initGame();
    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGame]);

  // Resume audio on first interaction
  useEffect(() => {
    const handleInteraction = () => audio.resume();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [audio]);

  return (
    <div className="z-50 fixed inset-0 overflow-hidden cursor-none">
      <canvas ref={canvasRef} className="absolute inset-0 bg-[#f8fafc] w-full h-full" />

      {/* HUD Overlay */}
      <div className="top-4 left-4 absolute bg-white/80 backdrop-blur-sm px-3 py-2 border rounded-md text-slate-700 text-sm pointer-events-none">
        Action Stickman Mode
      </div>

      <div className="top-4 right-4 absolute bg-white/80 backdrop-blur-sm px-3 py-2 border rounded-md text-slate-700 text-sm pointer-events-none">
        Defeated {Math.max(0, collectionStep - 1)} / {collectionTotal}
      </div>

      {/* Progress diamonds */}
      <div className="top-14 left-1/2 absolute flex gap-2 -translate-x-1/2 pointer-events-none">
        {Array.from({ length: collectionTotal }).map((_, idx) => (
          <div
            key={idx}
            className={`h-3 w-3 rotate-45 transform border-2 border-slate-900 transition-colors ${
              idx < collectionStep - 1
                ? 'bg-slate-900'
                : idx === collectionStep - 1
                  ? 'scale-125 bg-red-500'
                  : 'bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
