'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { CalibrationModeViewProps } from '../types';
import { getCalibrationAudio } from '../../../lib/calibration-audio';
import { drawStickman, type StickmanPose } from './stickman-renderer';
import {
  type Particle,
  type SpeedLine,
  createHitSparks,
  drawAndUpdateParticles,
  drawAndUpdateSpeedLines,
} from './particle-system';
import { cn } from '@/lib/utils';

/**
 * Stickman Canvas — Gamified calibration mode.
 *
 * A ninja stickman sprints/walks to each calibration point.
 * The user locks gaze onto the ninja to "defeat" it (progress ring fills).
 * On capture, the ninja vanishes in a smoke-poof and speed-lines.
 *
 * Phase flow:
 *   sequence   → Stickman moves from edge through exploration to target
 *   collecting → Idle at target; gaze fills scan ring over SCAN_DURATION_MS
 *   shattered  → Poof + shrink animation on completion
 *   waiting    → Brief pause before next point
 *
 * Research decisions:
 * - No "Lock on!" text during collecting — text near target creates a
 *   competing fixation stimulus (Holmqvist & Andersson 2017)
 * - Warm cream background (#FDF8F0) matches test screen — PSA prevention
 *   (Mathôt et al. 2013)
 * - Speed lines only during sequence phase — no peripheral motion during
 *   active gaze collection
 * - Hit sparks only when gaze is near: avoids reinforcing wrong fixation
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
  type: 'dash' | 'walk';
  pause?: number;
  pose?: StickmanPose;
}

// Timing constants
const SCAN_DURATION_MS = 2000;
const HIT_COOLDOWN_MS = 600;
const SHATTER_DISPLAY_MS = 1400;
const STICKMAN_SPEED_FACTOR = 1.85;

export function StickmanCanvas({
  currentPoint,
  collectionStep,
  collectionTotal,
  isStableFixation,
  gazeX,
  gazeY,
  onSampleCollected,
}: StickmanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef(0);
  const gazeRef = useRef({ x: gazeX, y: gazeY });
  const lastRenderTimeRef = useRef(0);
  const pointKeyRef = useRef('');
  const renderRef = useRef<((time: number) => void) | null>(null);

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

  /* ── Path generation ──────────────────────────────────────── */

  const generatePath = useCallback(
    (
      targetX: number,
      targetY: number,
      width: number,
      height: number,
    ): { waypoints: Waypoint[]; startX: number; startY: number } => {
      const pace = (ms: number) => Math.round(ms * STICKMAN_SPEED_FACTOR);

      // Spawn from random screen edge
      const edge = Math.floor(Math.random() * 4);
      let startX: number, startY: number;
      if (edge === 0) {
        startX = Math.random() * width;
        startY = -50;
      } else if (edge === 1) {
        startX = width + 50;
        startY = Math.random() * height;
      } else if (edge === 2) {
        startX = Math.random() * width;
        startY = height + 50;
      } else {
        startX = -50;
        startY = Math.random() * height;
      }

      // 1-2 random exploration stops, then approach, then target
      const pts = [{ x: startX, y: startY }];
      const explorationCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < explorationCount; i++) {
        pts.push({
          x: width * 0.15 + Math.random() * 0.7 * width,
          y: height * 0.15 + Math.random() * 0.7 * height,
        });
      }
      const approachDir = targetX > pts[pts.length - 1].x ? -1 : 1;
      pts.push({ x: targetX + approachDir * 80, y: targetY });
      pts.push({ x: targetX, y: targetY });

      const waypoints: Waypoint[] = [];
      for (let i = 1; i < pts.length; i++) {
        if (i === pts.length - 1) {
          // Final: slow walk in
          waypoints.push({
            x: pts[i].x,
            y: pts[i].y,
            duration: pace(700),
            type: 'walk',
            pose: 'idle',
          });
        } else if (i === pts.length - 2) {
          // Near approach: walk
          waypoints.push({
            x: pts[i].x,
            y: pts[i].y,
            duration: pace(500),
            pause: pace(100),
            type: 'walk',
          });
        } else {
          // Exploration: sprint → skid on arrival
          waypoints.push({
            x: pts[i].x,
            y: pts[i].y,
            duration: pace(300),
            pause: pace(150),
            type: 'dash',
            pose: 'skid',
          });
        }
      }
      return { waypoints, startX, startY };
    },
    [],
  );

  /* ── Game init ────────────────────────────────────────────── */

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use window dimensions (reliable at fullscreen)
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const targetX = currentPoint.x * w;
    const targetY = currentPoint.y * h;
    const { waypoints, startX, startY } = generatePath(targetX, targetY, w, h);

    gameRef.current = {
      phase: 'sequence',
      waypoints,
      currentWpIndex: 0,
      wpStartTime: performance.now(),
      startX,
      startY,
      stickX: startX,
      stickY: startY,
      stickAngle: 0,
      pose: 'idle',
      facingRight: true,
      scanProgress: 0,
      screenShake: 0,
      lastHitTime: 0,
      phaseStartTime: performance.now(),
      particles: [],
      speedLines: [],
      lastStepTime: 0,
      sampleCollectedForThisPoint: false,
      width: w,
      height: h,
      dpr,
    };

    audio.play('spawn');
  }, [currentPoint, audio, generatePath]);

  /* ── Render loop ──────────────────────────────────────────── */

  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      if (!canvas || !game) {
        animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const delta = lastRenderTimeRef.current ? Math.min(time - lastRenderTimeRef.current, 50) : 16;
      lastRenderTimeRef.current = time;

      const { width: w, height: h, dpr } = game;
      const gaze = gazeRef.current;
      const hitRadius = 38;

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Background — warm cream
      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, 0, w, h);

      // Very faint warm grid
      ctx.strokeStyle = 'rgba(45,42,38,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Screen shake
      ctx.save();
      if (game.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * game.screenShake,
          (Math.random() - 0.5) * game.screenShake,
        );
        game.screenShake *= 0.82;
        if (game.screenShake < 0.4) game.screenShake = 0;
      }

      const mouseDist = Math.hypot(game.stickX - gaze.x, game.stickY - gaze.y);

      /* ── SEQUENCE: stickman moves ── */
      if (game.phase === 'sequence') {
        const wp = game.waypoints[game.currentWpIndex];
        if (!wp) {
          game.phase = 'collecting';
          game.phaseStartTime = time;
        } else {
          const elapsed = time - game.wpStartTime;
          if (elapsed < wp.duration) {
            const t = elapsed / wp.duration;
            game.facingRight = wp.x >= game.startX;
            game.stickAngle = Math.atan2(wp.y - game.startY, wp.x - game.startX);

            if (wp.type === 'walk') {
              game.pose = 'walk';
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * t;
              if (time - game.lastStepTime > 320) {
                audio.play('step');
                game.lastStepTime = time;
              }
            } else {
              game.pose = 'sprint';
              if (t < 0.025) audio.play('dash');
              const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              game.stickX = game.startX + (wp.x - game.startX) * easeT;
              game.stickY = game.startY + (wp.y - game.startY) * easeT;
              // Speed lines only during sprint
              if (Math.random() > 0.5) {
                game.speedLines.push({
                  x: game.stickX + (Math.random() - 0.5) * 50,
                  y: game.stickY + (Math.random() - 0.5) * 50,
                  angle: game.stickAngle,
                  length: 25 + Math.random() * 45,
                  life: 90,
                });
              }
            }
          } else {
            game.stickX = wp.x;
            game.stickY = wp.y;
            game.pose = wp.pose ?? 'idle';
            if (elapsed - wp.duration < 20 && wp.type === 'dash') audio.play('skid');
            if (elapsed > wp.duration + (wp.pause ?? 0)) {
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

          // Hit sparks when gaze is near ninja during movement
          if (mouseDist < hitRadius * 2.5 && time - game.lastHitTime > HIT_COOLDOWN_MS) {
            audio.play('hit');
            game.lastHitTime = time;
            game.particles.push(...createHitSparks(game.stickX, game.stickY));
          }
        }
      }

      /* ── COLLECTING: hold gaze to fill ring ── */
      if (game.phase === 'collecting') {
        game.pose = 'idle';
        const hasLock = isStableFixation || mouseDist < hitRadius;

        if (hasLock) {
          game.scanProgress += delta / SCAN_DURATION_MS;
          const tick = Math.floor(game.scanProgress * 10);
          const prevTick = Math.floor((game.scanProgress - delta / SCAN_DURATION_MS) * 10);
          if (tick !== prevTick && game.scanProgress < 1) {
            audio.play('scanTick', { progress: game.scanProgress });
          }
          if (game.scanProgress >= 1 && !game.sampleCollectedForThisPoint) {
            game.phase = 'shattered';
            game.phaseStartTime = time;
            game.sampleCollectedForThisPoint = true;
            game.scanProgress = 1;
            audio.play('collect');
            game.screenShake = 10;

            // Smoke poof burst
            const count = 14;
            for (let i = 0; i < count; i++) {
              const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
              const speed = 70 + Math.random() * 70;
              game.particles.push({
                type: 'dust',
                x: game.stickX + Math.cos(angle) * 6,
                y: game.stickY + Math.sin(angle) * 6,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 25,
                life: 480 + Math.random() * 280,
                maxLife: 760,
              });
            }
            onSampleCollected?.();
          }
        } else {
          // Gentle fade-back (not instant reset)
          game.scanProgress = Math.max(0, game.scanProgress - delta / 700);
        }
      }

      /* ── SHATTERED: ninja poof + vanish ── */
      if (game.phase === 'shattered') {
        const teleportElapsed = time - game.phaseStartTime;
        if (teleportElapsed < 280) {
          const t = teleportElapsed / 280;
          ctx.save();
          ctx.globalAlpha = 1 - t;
          ctx.translate(game.stickX, game.stickY);
          ctx.scale(1 - t * t, 1 - t * t);
          ctx.translate(-game.stickX, -game.stickY);
          drawStickman(ctx, game.stickX, game.stickY, time, 'idle', game.facingRight);
          ctx.restore();
        }
        if (teleportElapsed > SHATTER_DISPLAY_MS) game.phase = 'waiting';
      }

      /* ── Draw: speed lines → stickman → scan ring → particles ── */
      // Speed lines only during sequence
      if (game.phase === 'sequence') {
        drawAndUpdateSpeedLines(ctx, game.speedLines, delta);
      }

      if (game.phase !== 'shattered' && game.phase !== 'waiting') {
        drawStickman(ctx, game.stickX, game.stickY, time, game.pose, game.facingRight);

        // Scan ring during collecting
        if (game.phase === 'collecting') {
          // Track background arc
          ctx.beginPath();
          ctx.arc(game.stickX, game.stickY, hitRadius + 10, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(30,41,59,0.10)';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Progress arc
          if (game.scanProgress > 0) {
            ctx.beginPath();
            ctx.arc(
              game.stickX,
              game.stickY,
              hitRadius + 10,
              -Math.PI / 2,
              -Math.PI / 2 + game.scanProgress * Math.PI * 2,
            );
            ctx.strokeStyle = `rgba(220,38,38,${0.65 + game.scanProgress * 0.35})`;
            ctx.lineCap = 'round';
            ctx.lineWidth = 5;
            ctx.stroke();
          }

          // Gaze-on pulse when locked
          if (isStableFixation || mouseDist < hitRadius) {
            ctx.beginPath();
            ctx.arc(game.stickX, game.stickY, hitRadius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(220,38,38,${0.08 + Math.sin(time * 0.009) * 0.05})`;
            ctx.lineWidth = 10;
            ctx.stroke();
          }
        }
      }

      drawAndUpdateParticles(ctx, game.particles, delta);
      ctx.restore(); // screen shake restore

      animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    },
    [isStableFixation, audio, onSampleCollected],
  );

  /* ── Effect wiring ────────────────────────────────────────── */

  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  useEffect(() => {
    const key = `${currentPoint.x}:${currentPoint.y}:${collectionStep}`;
    if (key === pointKeyRef.current) return;
    pointKeyRef.current = key;
    lastRenderTimeRef.current = 0;
    initGame();
  }, [currentPoint, collectionStep, initGame]);

  useEffect(() => {
    initGame();
    const onResize = () => initGame();
    window.addEventListener('resize', onResize);
    animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGame]);

  useEffect(() => {
    const handle = () => audio.resume();
    window.addEventListener('click', handle, { once: true });
    window.addEventListener('keydown', handle, { once: true });
    return () => {
      window.removeEventListener('click', handle);
      window.removeEventListener('keydown', handle);
    };
  }, [audio]);

  const activeIdx = collectionStep - 1;

  return (
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Bottom HUD strip */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E8E0D4] bg-white/55 px-3 py-1.5 text-[11px] text-[#8B857E] backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Ninja Mode
        </div>

        <div className="flex items-center gap-1">
          {Array.from({ length: collectionTotal }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-full transition-all duration-300',
                idx < activeIdx
                  ? 'h-2 w-2 bg-red-500/70'
                  : idx === activeIdx
                    ? 'h-2.5 w-2.5 bg-red-500 shadow-[0_0_5px_rgba(220,38,38,0.5)]'
                    : 'h-1.5 w-1.5 bg-[#D4CBBD]/50',
              )}
            />
          ))}
        </div>

        <div className="rounded-lg border border-[#E8E0D4] bg-white/55 px-3 py-1.5 text-[11px] backdrop-blur-sm">
          <span className="font-semibold text-red-600">{collectionStep}</span>
          <span className="text-[#C4BDB4]"> / </span>
          <span className="text-[#6B6560]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
