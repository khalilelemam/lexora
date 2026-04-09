'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { CalibrationModeViewProps } from '../types';
import { getCalibrationAudio } from '../../../lib/calibration-audio';

/**
 * Stickman Canvas - Faithful port of sticky.jsx
 *
 * Key mechanics:
 * - Phase 1 (sequence): Stickman moves through waypoints (dash/jump/walk)
 * - Phase 2 (collecting): Stickman is idle, gaze fills scan ring over 1.5s
 * - Phase 3 (shattered): Explosion with bone physics
 * - Hit sparks during sequence phase (visual feedback only, no calibration)
 */

export interface StickmanCanvasProps extends CalibrationModeViewProps {
  gazeX: number;
  gazeY: number;
  onSampleCollected?: () => void;
}

type GamePhase = 'sequence' | 'collecting' | 'shattered' | 'waiting';
type StickmanPose = 'idle' | 'sprint' | 'jump' | 'fall' | 'walk' | 'proud';

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

interface Particle {
  type: 'spark' | 'dust' | 'slash';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  angle?: number;
  length?: number;
  life: number;
  maxLife: number;
}

interface Bone {
  type: 'head' | 'spine' | 'limb';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  life: number;
}

interface SpeedLine {
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;
}

// Scan duration in milliseconds (time to fill the ring)
const SCAN_DURATION_MS = 2200;
// Hit spark cooldown
const HIT_COOLDOWN_MS = 150;
// Shatter display time
const SHATTER_DISPLAY_MS = 1200;
const STICKMAN_SPEED_FACTOR = 1.35;

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

  // Generate path for stickman
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
            {
              x: width * 0.2,
              y: height * 0.8,
              duration: pace(250),
              pause: pace(200),
              type: 'dash',
            },
            {
              x: width * 0.8,
              y: height * 0.2,
              duration: pace(250),
              pause: pace(200),
              type: 'dash',
            },
            {
              x: targetX,
              y: targetY,
              duration: pace(450),
              type: 'jump',
              arc: 200,
              pose: 'proud',
              impact: true,
            },
          ],
        };
      }

      // Minion: spawn from random edge
      const edge = Math.floor(Math.random() * 4);
      let startX: number, startY: number;

      if (edge === 0) {
        // Top
        startX = Math.random() * width;
        startY = -50;
      } else if (edge === 1) {
        // Right
        startX = width + 50;
        startY = Math.random() * height;
      } else if (edge === 2) {
        // Bottom
        startX = Math.random() * width;
        startY = height + 50;
      } else {
        // Left
        startX = -50;
        startY = Math.random() * height;
      }

      // Build intermediate points
      const pts = [{ x: startX, y: startY }];
      for (let i = 0; i < 2; i++) {
        pts.push({
          x: width * 0.15 + Math.random() * 0.7 * width,
          y: height * 0.15 + Math.random() * 0.7 * height,
        });
      }

      // Pre-final approach point
      const approachDir = targetX > pts[pts.length - 1].x ? -1 : 1;
      pts.push({ x: targetX + approachDir * 100, y: targetY });
      pts.push({ x: targetX, y: targetY });

      // Build waypoints with obstacles
      const waypoints: Waypoint[] = [];
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];

        if (i === pts.length - 1) {
          // Final stretch is a walk
          waypoints.push({ x: curr.x, y: curr.y, duration: pace(900), type: 'walk', pose: 'idle' });
        } else {
          const isObstacleJump = Math.random() > 0.4;
          if (isObstacleJump) {
            const obsX = (prev.x + curr.x) / 2;
            const obsY = (prev.y + curr.y) / 2;
            waypoints.push({
              x: curr.x,
              y: curr.y,
              duration: pace(450),
              pause: pace(120),
              type: 'jump',
              arc: 120,
              obstacle: { x: obsX, y: obsY, active: true },
              impact: true,
            });
          } else {
            waypoints.push({
              x: curr.x,
              y: curr.y,
              duration: pace(300),
              pause: pace(170),
              type: 'dash',
              impact: false,
            });
          }
        }
      }

      return { waypoints, startX, startY };
    },
    [],
  );

  // Draw stickman (faithful to sticky.jsx)
  const drawStickman = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      time: number,
      pose: StickmanPose,
      facingRight: boolean,
      isBoss: boolean,
    ) => {
      const scale = isBoss ? 0.9 : 0.4;

      ctx.save();
      ctx.translate(x, y);
      if (!facingRight) ctx.scale(-1, 1);
      ctx.scale(scale, scale);

      ctx.strokeStyle = isBoss ? '#dc2626' : '#0f172a';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isBoss) {
        ctx.shadowColor = 'rgba(220, 38, 38, 0.8)';
        ctx.shadowBlur = 15;
      }

      const t = time * 0.05;
      let hipY = 0;
      let spineAngle = 0;
      const headY = -35;
      let arm1: number[] = [];
      let arm2: number[] = [];
      let leg1: number[] = [];
      let leg2: number[] = [];

      if (pose === 'sprint') {
        spineAngle = 0.6;
        hipY = Math.sin(t * 2) * 4;
        arm1 = [0, -25, 3.4, 3.5];
        arm2 = [0, -25, 3.7, 3.8];
        const legSwing = Math.cos(t * 1.5);
        leg1 = [0, hipY, Math.PI / 2 + legSwing * 1.2, Math.PI / 2 + legSwing * 1.2 + 0.5];
        leg2 = [0, hipY, Math.PI / 2 - legSwing * 1.2, Math.PI / 2 - legSwing * 1.2 + 0.5];
      } else if (pose === 'jump') {
        spineAngle = 0.4;
        hipY = -15;
        arm1 = [0, -25, 3.0, 3.2];
        arm2 = [0, -25, 3.4, 3.6];
        leg1 = [0, hipY, 2.8, 3.2];
        leg2 = [0, hipY, 2.2, 2.6];
      } else if (pose === 'fall') {
        spineAngle = -0.1;
        hipY = -5;
        const flail = Math.sin(t);
        arm1 = [0, -25, -0.5 + flail * 0.5, -1.0];
        arm2 = [0, -25, 3.5 - flail * 0.5, 4.0];
        leg1 = [0, hipY, 2.0, 1.5];
        leg2 = [0, hipY, 1.0, 1.5];
      } else if (pose === 'walk') {
        spineAngle = 0.05;
        hipY = Math.sin(t * 0.5) * 3;
        const swing = Math.sin(t * 0.4);
        arm1 = [0, -25, Math.PI / 2 + swing * 0.5, Math.PI / 2 + swing * 0.5];
        arm2 = [0, -25, Math.PI / 2 - swing * 0.5, Math.PI / 2 - swing * 0.5];
        leg1 = [0, hipY, Math.PI / 2 + swing * 0.6, Math.PI / 2 + swing * 0.6 + 0.2];
        leg2 = [0, hipY, Math.PI / 2 - swing * 0.6, Math.PI / 2 - swing * 0.6 + 0.2];
      } else if (pose === 'idle') {
        spineAngle = 0;
        hipY = Math.sin(time * 0.005) * 2;
        arm1 = [0, -25, 1.4, 1.5];
        arm2 = [0, -25, 1.7, 1.6];
        leg1 = [0, hipY, 1.5, 1.5];
        leg2 = [0, hipY, 1.6, 1.5];
      } else if (pose === 'proud') {
        spineAngle = 0;
        hipY = 0;
        arm1 = [0, -25, 0.5, 2.5];
        arm2 = [0, -25, 2.6, 0.6];
        leg1 = [0, hipY, 1.2, 1.5];
        leg2 = [0, hipY, 1.9, 1.5];
      }

      ctx.rotate(spineAngle);

      // Spine
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(0, hipY - 30);
      ctx.stroke();

      // Head
      ctx.beginPath();
      ctx.arc(0, hipY + headY, 12, 0, Math.PI * 2);
      if (isBoss) {
        ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.stroke();
      }

      // Draw limbs
      const drawLimb = (arr: number[]) => {
        if (!arr.length) return;
        const [sx, sy, a1, a2] = arr;
        const len = 16;
        const mx = sx + Math.cos(a1) * len;
        const my = sy + Math.sin(a1) * len;
        const ex = mx + Math.cos(a2) * len;
        const ey = my + Math.sin(a2) * len;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(mx, my);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      };

      ctx.strokeStyle = isBoss ? '#dc2626' : '#0f172a';
      drawLimb(arm1);
      drawLimb(arm2);
      drawLimb(leg1);
      drawLimb(leg2);

      ctx.restore();
    },
    [],
  );

  // Explode stickman into bones
  const explodeStickman = useCallback((game: NonNullable<typeof gameRef.current>) => {
    const burst = 25;
    const boneTypes: Array<'head' | 'spine' | 'limb'> = [
      'head',
      'spine',
      'limb',
      'limb',
      'limb',
      'limb',
    ];

    for (let i = 0; i < 6; i++) {
      game.bones.push({
        type: boneTypes[i],
        x: game.stickX,
        y: game.stickY,
        vx: (Math.random() - 0.5) * burst,
        vy: -Math.random() * burst - 5,
        angle: 0,
        angVel: (Math.random() - 0.5) * 1.2,
        life: 2000,
      });
    }

    // Slash particles
    for (let i = 0; i < 20; i++) {
      game.particles.push({
        type: 'slash',
        x: game.stickX,
        y: game.stickY,
        angle: Math.random() * Math.PI * 2,
        length: Math.random() * 100 + 40,
        life: 300,
        maxLife: 300,
      });
    }
  }, []);

  // Initialize game for current point
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

    const { waypoints, startX, startY } = generatePath(
      targetX,
      targetY,
      width,
      height,
      isBossPoint,
    );

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
      bones: [],
      speedLines: [],
      lastStepTime: 0,
      sampleCollectedForThisPoint: false,
      width,
      height,
      dpr,
    };

    // Play spawn sound
    if (isBossPoint) {
      audio.play('bossSpawn');
    } else {
      audio.play('spawn');
    }
  }, [currentPoint, isBossPoint, audio, generatePath]);

  // Main render loop
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
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Apply screen shake
      ctx.save();
      if (game.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * game.screenShake,
          (Math.random() - 0.5) * game.screenShake,
        );
        game.screenShake *= 0.85;
        if (game.screenShake < 0.5) game.screenShake = 0;
      }

      const mouseDist = Math.hypot(game.stickX - gaze.x, game.stickY - gaze.y);

      // === PHASE: SEQUENCE (movement) ===
      if (game.phase === 'sequence') {
        const wp = game.waypoints[game.currentWpIndex];
        if (!wp) {
          game.phase = 'collecting';
          game.phaseStartTime = time;
        } else {
          const elapsed = time - game.wpStartTime;

          if (elapsed < wp.duration) {
            const t = elapsed / wp.duration;

            // Update facing direction
            if (wp.x > game.startX) game.facingRight = true;
            else if (wp.x < game.startX) game.facingRight = false;

            game.stickAngle = Math.atan2(wp.y - game.startY, wp.x - game.startX);

            if (wp.type === 'jump') {
              game.pose = 'jump';
              if (t < 0.02) audio.play('jump');
              const arcY = Math.sin(t * Math.PI) * (wp.arc || 120);
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * t - arcY;

              // Obstacle destruction
              if (wp.obstacle && wp.obstacle.active && t >= 0.5) {
                wp.obstacle.active = false;
                audio.play('obstacleBreak');
                game.screenShake = 10;
                // Spawn particles
                for (let i = 0; i < 15; i++) {
                  game.particles.push({
                    type: 'slash',
                    x: wp.obstacle.x,
                    y: wp.obstacle.y - 10,
                    angle: Math.random() * Math.PI * 2,
                    length: Math.random() * 40 + 10,
                    life: 200,
                    maxLife: 200,
                  });
                  game.particles.push({
                    type: 'dust',
                    x: wp.obstacle.x,
                    y: wp.obstacle.y,
                    vx: (Math.random() - 0.5) * 15,
                    vy: (Math.random() - 0.5) * 15,
                    life: 200,
                    maxLife: 200,
                  });
                }
              }
            } else if (wp.type === 'fall') {
              game.pose = 'fall';
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * (t * t);
            } else if (wp.type === 'walk') {
              game.pose = 'walk';
              game.stickX = game.startX + (wp.x - game.startX) * t;
              game.stickY = game.startY + (wp.y - game.startY) * t;
              // Footsteps
              if (time - game.lastStepTime > 300) {
                audio.play('step');
                game.lastStepTime = time;
              }
            } else {
              // DASH
              game.pose = 'sprint';
              if (t < 0.02) audio.play('dash');
              // Ease in-out
              const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              game.stickX = game.startX + (wp.x - game.startX) * easeT;
              game.stickY = game.startY + (wp.y - game.startY) * easeT;

              // Speed lines
              if (Math.random() > 0.4) {
                game.speedLines.push({
                  x: game.stickX + (Math.random() - 0.5) * 60,
                  y: game.stickY + (Math.random() - 0.5) * 60,
                  angle: game.stickAngle,
                  length: 30 + Math.random() * 50,
                  life: 100,
                });
              }
            }
          } else {
            // Waypoint reached
            game.stickX = wp.x;
            game.stickY = wp.y;
            game.pose = wp.pose || 'idle';

            // Landing effects (only on first frame after reaching)
            const justReached = elapsed - wp.duration < 20;
            if (justReached) {
              if (wp.type === 'dash') audio.play('skid');
              if (wp.impact) {
                game.screenShake = isBossPoint ? 30 : 8;
                if (isBossPoint) audio.play('bossLand');
                else audio.play('land');
                // Dust particles
                for (let i = 0; i < 8; i++) {
                  game.particles.push({
                    type: 'dust',
                    x: game.stickX,
                    y: game.stickY + 20,
                    vx: (Math.random() - 0.5) * 15,
                    vy: -Math.random() * 5,
                    life: 300,
                    maxLife: 300,
                  });
                }
              }
            }

            // Wait for pause duration
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

          // Hit sparks during movement (visual feedback only)
          const feedbackHitActive =
            mouseDist < hitRadius * 2 || isStableFixation || fixationProgress > 0.35;
          if (feedbackHitActive && time - game.lastHitTime > HIT_COOLDOWN_MS) {
            audio.play('hit');
            game.lastHitTime = time;
            for (let i = 0; i < 2; i++) {
              game.particles.push({
                type: 'spark',
                x: game.stickX + (Math.random() - 0.5) * 30,
                y: game.stickY + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 200,
                maxLife: 200,
              });
            }
          }
        }
      }

      // === PHASE: COLLECTING (fixation) ===
      if (game.phase === 'collecting') {
        const hasStableLock = isStableFixation || mouseDist < hitRadius;
        if (hasStableLock) {
          // Progress fills over SCAN_DURATION_MS
          game.scanProgress += deltaMs / SCAN_DURATION_MS;

          // Tick sound
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
            explodeStickman(game);

            // Notify parent that this point is complete
            onSampleCollected?.();
          }
        } else {
          // Gentle decay while lock is lost
          game.scanProgress = Math.max(0, game.scanProgress - deltaMs / 650);
        }
      }

      // === PHASE: SHATTERED ===
      if (game.phase === 'shattered') {
        if (time - game.phaseStartTime > SHATTER_DISPLAY_MS) {
          game.phase = 'waiting';
        }
      }

      // === DRAW OBSTACLE ===
      if (game.phase === 'sequence') {
        const currentWp = game.waypoints[game.currentWpIndex];
        if (currentWp?.obstacle?.active) {
          ctx.save();
          ctx.translate(currentWp.obstacle.x, currentWp.obstacle.y);
          // Black rocky base
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(-15, 10);
          ctx.lineTo(0, -30);
          ctx.lineTo(15, 10);
          ctx.closePath();
          ctx.fill();
          // Red glowing tip
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-5, -10);
          ctx.lineTo(0, -30);
          ctx.lineTo(5, -10);
          ctx.stroke();
          ctx.restore();
        }
      }

      // === DRAW SPEED LINES ===
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      for (let i = game.speedLines.length - 1; i >= 0; i--) {
        const sl = game.speedLines[i];
        sl.life -= deltaMs;
        ctx.globalAlpha = Math.max(0, sl.life / 100);
        ctx.beginPath();
        ctx.moveTo(sl.x, sl.y);
        ctx.lineTo(sl.x - Math.cos(sl.angle) * sl.length, sl.y - Math.sin(sl.angle) * sl.length);
        ctx.stroke();
        if (sl.life <= 0) game.speedLines.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // === DRAW STICKMAN (unless shattered) ===
      if (game.phase !== 'shattered' && game.phase !== 'waiting') {
        drawStickman(ctx, game.stickX, game.stickY, time, game.pose, game.facingRight, isBossPoint);

        // Draw scan ring during collecting
        if (game.phase === 'collecting') {
          ctx.save();
          ctx.translate(game.stickX, game.stickY);

          if (isBossPoint) {
            // Boss: hexagonal energy shield
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
            // Regular: progress ring
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

          // "FIXATE" / "OVERLOAD" text
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = isBossPoint ? '#ef4444' : '#2563eb';
          ctx.globalAlpha = 0.5 + Math.sin(time * 0.01) * 0.5;
          ctx.fillText(
            isBossPoint ? 'OVERLOAD!' : 'FIXATE',
            game.stickX,
            game.stickY + hitRadius + 20,
          );
          ctx.globalAlpha = 1;
        }
      }

      // === DRAW PARTICLES ===
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.life -= deltaMs;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);

        if (p.type === 'spark') {
          p.x += p.vx || 0;
          p.y += p.vy || 0;
          ctx.fillStyle = '#eab308';
          ctx.fillRect(p.x, p.y, 4, 4);
        } else if (p.type === 'dust') {
          p.x += p.vx || 0;
          p.y += p.vy || 0;
          if (p.vx) p.vx *= 0.9;
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0, p.life / 60), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'slash') {
          const prog = 1 - p.life / p.maxLife;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(
            p.x + Math.cos(p.angle || 0) * (p.length || 0) * prog,
            p.y + Math.sin(p.angle || 0) * (p.length || 0) * prog,
          );
          ctx.lineTo(
            p.x + Math.cos(p.angle || 0) * (p.length || 0),
            p.y + Math.sin(p.angle || 0) * (p.length || 0),
          );
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      // === DRAW BONES ===
      ctx.strokeStyle = isBossPoint ? '#dc2626' : '#000000';
      ctx.lineWidth = 8 * scale;
      ctx.lineCap = 'round';
      for (let i = game.bones.length - 1; i >= 0; i--) {
        const b = game.bones[i];
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.8; // Gravity
        b.angle += b.angVel;
        b.life -= deltaMs;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.globalAlpha = Math.max(0, b.life / 1000);

        if (b.type === 'head') {
          ctx.beginPath();
          ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2);
          if (isBossPoint) {
            ctx.fill();
          } else {
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();
          }
        } else if (b.type === 'spine') {
          ctx.beginPath();
          ctx.moveTo(0, -15 * scale);
          ctx.lineTo(0, 15 * scale);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-12 * scale, -12 * scale);
          ctx.lineTo(0, 0);
          ctx.lineTo(12 * scale, -6 * scale);
          ctx.stroke();
        }

        ctx.restore();
        if (b.life <= 0) game.bones.splice(i, 1);
      }

      ctx.restore(); // Restore from screen shake

      animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    },
    [
      isBossPoint,
      fixationProgress,
      isStableFixation,
      audio,
      drawStickman,
      explodeStickman,
      onSampleCollected,
    ],
  );

  // Keep render ref up to date
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

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

    const handleResize = () => {
      initGame();
    };

    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGame]);

  // Resume audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      audio.resume();
    };

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
