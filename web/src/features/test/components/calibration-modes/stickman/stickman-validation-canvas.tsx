'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { drawStickman, type StickmanPose } from './stickman-renderer';
import { getCalibrationAudio } from '../../../lib/calibration-audio';
import { drawAndUpdateParticles, createPoofParticles, type Particle } from './particle-system';

interface StickmanValidationCanvasProps {
  /** Validation target point (normalized 0-1) */
  target: { x: number; y: number } | null;
  /** Live gaze position (pixel coords) */
  gazeX: number;
  gazeY: number;
  /** 0-1 hold progress for this validation point */
  holdProgress: number;
  /** step / total for HUD */
  currentStep: number;
  totalSteps: number;
}

type NinjaPhase =
  | 'approaching' // ninja runs/sprints toward target
  | 'cornered' // ninja arrived, taking damage
  | 'defeated' // ninja falls, poof, then next
  | 'done'; // all points complete

interface NinjaState {
  phase: NinjaPhase;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  approachStart: number;
  approachDuration: number;
  pose: StickmanPose;
  facingRight: boolean;
  health: number; // 1 → 0 during cornered phase
  fallProgress: number; // 0 → 1 during defeated phase
  defeatStart: number;
  particles: Particle[];
  screenShake: number;
  lastHitTime: number;
  poofDone: boolean;
  width: number;
  height: number;
  dpr: number;
}

const APPROACH_DURATION_MS = 1800;
const HIT_COOLDOWN_MS = 400;
const DEFEAT_ANIM_MS = 1200;
const HIT_RADIUS_PX = 70;

/**
 * StickmanValidationCanvas — "Ninja Takedown" validation experience.
 *
 * Flow:
 * 1. Ninja sprints in from a random edge toward the target position
 * 2. Gets "cornered" when it arrives — takes damage from child's laser gaze
 * 3. When held long enough, falls to knees then poofs away
 * 4. Repeat for each validation target
 *
 * The damage is cosmetic — the actual validation samples are collected by
 * the calibration engine via holdProgress prop.
 */
export function StickmanValidationCanvas({
  target,
  gazeX,
  gazeY,
  holdProgress,
  currentStep,
  totalSteps,
}: StickmanValidationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gazeRef = useRef({ x: gazeX, y: gazeY });
  const stateRef = useRef<NinjaState | null>(null);
  const renderRef = useRef<((time: number) => void) | null>(null);
  const prevTargetRef = useRef<{ x: number; y: number } | null>(null);
  const holdProgressRef = useRef(holdProgress);

  useEffect(() => {
    gazeRef.current = { x: gazeX, y: gazeY };
  }, [gazeX, gazeY]);
  useEffect(() => {
    holdProgressRef.current = holdProgress;
  }, [holdProgress]);

  const audio = useMemo(() => getCalibrationAudio(), []);

  /** Pick a random spawn position along the screen edge */
  const pickEdgeSpawn = useCallback((w: number, h: number): { x: number; y: number } => {
    const edge = Math.floor(Math.random() * 4);
    const margin = 60;
    switch (edge) {
      case 0:
        return { x: Math.random() * w, y: -margin }; // top
      case 1:
        return { x: Math.random() * w, y: h + margin }; // bottom
      case 2:
        return { x: -margin, y: Math.random() * h }; // left
      default:
        return { x: w + margin, y: Math.random() * h }; // right
    }
  }, []);

  /** Initialise ninja state for a new target */
  const initNinja = useCallback(
    (targetNorm: { x: number; y: number }, w: number, h: number, dpr: number): NinjaState => {
      const targetX = targetNorm.x * w;
      const targetY = targetNorm.y * h;
      const spawn = pickEdgeSpawn(w, h);

      return {
        phase: 'approaching',
        x: spawn.x,
        y: spawn.y,
        startX: spawn.x,
        startY: spawn.y,
        targetX,
        targetY,
        approachStart: performance.now(),
        approachDuration: APPROACH_DURATION_MS,
        pose: 'sprint',
        facingRight: spawn.x < targetX,
        health: 1,
        fallProgress: 0,
        defeatStart: 0,
        particles: [],
        screenShake: 0,
        lastHitTime: 0,
        poofDone: false,
        width: w,
        height: h,
        dpr,
      };
    },
    [pickEdgeSpawn],
  );

  /** easeInOutCubic */
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const state = stateRef.current;
      if (!canvas || !state) {
        animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }

      const { width: w, height: h, dpr } = state;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Screen shake
      ctx.save();
      if (state.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * state.screenShake * 4,
          (Math.random() - 0.5) * state.screenShake * 4,
        );
        state.screenShake = Math.max(0, state.screenShake - 0.5);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Background — warm cream, matches calibration + test
      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(45,42,38,0.04)';
      ctx.lineWidth = 1;
      const gridSize = Math.round(w / 24);
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ------ Phase logic ------
      const gaze = gazeRef.current;
      const progress = holdProgressRef.current;

      if (state.phase === 'approaching') {
        const elapsed = time - state.approachStart;
        const t = Math.min(1, elapsed / state.approachDuration);
        const et = ease(t);
        state.x = state.startX + (state.targetX - state.startX) * et;
        state.y = state.startY + (state.targetY - state.startY) * et;

        // Speed lines while sprinting
        if (t < 0.85) {
          ctx.strokeStyle = 'rgba(45,42,38,0.06)';
          ctx.lineWidth = 1;
          const lineDir = { x: state.targetX - state.startX, y: state.targetY - state.startY };
          const len = Math.hypot(lineDir.x, lineDir.y) || 1;
          const dx = (lineDir.x / len) * 40;
          const dy = (lineDir.y / len) * 40;
          for (let i = 0; i < 4; i++) {
            const lx = state.x + (Math.random() - 0.5) * 30;
            const ly = state.y + (Math.random() - 0.5) * 30;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx - dx, ly - dy);
            ctx.stroke();
          }
        }

        // Transition to cornered
        if (t >= 1) {
          state.phase = 'cornered';
          state.x = state.targetX;
          state.y = state.targetY;
          state.pose = 'idle';
        }
      } else if (state.phase === 'cornered') {
        // Sync health with hold progress from parent (cosmetic only)
        state.health = 1 - progress;

        // Draw damage aura / target reticle shrinking
        const auraRadius = 38 + (1 - progress) * 20;
        const dangerLevel = progress;

        // Outer crosshair reticle
        ctx.save();
        ctx.translate(state.x, state.y);
        ctx.strokeStyle = `rgba(220,38,38,${0.2 + dangerLevel * 0.7})`;
        ctx.lineWidth = 1.5;
        const rSize = auraRadius * 1.4;
        const gap = rSize * 0.25;
        // crosshair lines
        ctx.beginPath();
        ctx.moveTo(-rSize, 0);
        ctx.lineTo(-gap, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gap, 0);
        ctx.lineTo(rSize, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -rSize);
        ctx.lineTo(0, -gap);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, gap);
        ctx.lineTo(0, rSize);
        ctx.stroke();
        // damage ring
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220,38,38,${0.1 + dangerLevel * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        // progress arc
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = `rgba(220,38,38,${0.6 + dangerLevel * 0.4})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        // Hit sparks when gaze is close
        const dist = Math.hypot(gaze.x - state.x, gaze.y - state.y);
        const now = performance.now();
        if (dist < HIT_RADIUS_PX && now - state.lastHitTime > HIT_COOLDOWN_MS) {
          state.lastHitTime = now;
          state.screenShake = 2 + dangerLevel * 2;
          // Spark particles
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 80;
            state.particles.push({
              x: state.x,
              y: state.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 40,
              life: 400 + Math.random() * 200,
              maxLife: 600,
              size: 2 + Math.random() * 3,
              color: `hsl(${10 + Math.random() * 30},90%,55%)`,
              type: 'spark',
            } as Particle);
          }
          audio.play('hit');
        }

        // Wounded pose when heavily damaged
        if (progress > 0.65) state.pose = 'fall';
        else if (progress > 0.35)
          state.pose = 'walk'; // hunched
        else state.pose = 'idle';

        // Transition to defeated
        if (progress >= 1) {
          state.phase = 'defeated';
          state.defeatStart = time;
          state.fallProgress = 0;
          // Poof
          const poofParticles = createPoofParticles(state.x, state.y);
          state.particles.push(...poofParticles);
          audio.play('collect');
        }
      } else if (state.phase === 'defeated') {
        state.fallProgress = Math.min(1, (time - state.defeatStart) / DEFEAT_ANIM_MS);
        state.pose = 'proud'; // ninja slumped victorious child
      }

      // Draw stickman (not when fully defeated + poof done)
      const shouldDrawNinja = !(state.phase === 'defeated' && state.fallProgress > 0.7);
      if (shouldDrawNinja) {
        // Wounded tilt
        const tilt = state.phase === 'cornered' ? (1 - state.health) * 0.4 : 0;
        ctx.save();
        ctx.translate(state.x, state.y);
        if (tilt > 0) ctx.rotate(tilt * (state.facingRight ? 1 : -1));
        ctx.translate(-state.x, -state.y);
        drawStickman(ctx, state.x, state.y, time, state.pose, state.facingRight);
        ctx.restore();
      }

      // Particles
      drawAndUpdateParticles(ctx, state.particles, 16);

      // Gaze cursor — red "laser eye" for stickman mode
      ctx.beginPath();
      ctx.arc(gaze.x, gaze.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,38,38,0.6)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gaze.x, gaze.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,38,38,0.9)';
      ctx.fill();
      // Laser glow
      ctx.beginPath();
      ctx.arc(gaze.x, gaze.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,38,38,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    },
    [audio],
  );

  // Keep render ref fresh
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  // Re-init ninja when target changes
  useEffect(() => {
    if (!target) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Only reinit if target changed
    const prev = prevTargetRef.current;
    if (prev && Math.abs(prev.x - target.x) < 0.001 && Math.abs(prev.y - target.y) < 0.001) return;
    prevTargetRef.current = target;

    stateRef.current = initNinja(target, w, h, dpr);
  }, [target, initNinja]);

  // Canvas resize + start loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (stateRef.current) {
        stateRef.current.width = w;
        stateRef.current.height = h;
        stateRef.current.dpr = dpr;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame((t) => renderRef.current?.(t));

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden">
      <canvas ref={canvasRef} className="block" />

      {/* Bottom HUD */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-16 items-center justify-center">
        <div className="w-[min(420px,85vw)] rounded-xl border border-[#E8E0D4] bg-white/85 px-5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-[#8B857E]">🎯 Lock eyes on the ninja</span>
            <span className="text-xs font-semibold text-[#2D2A26]">
              {currentStep} / {totalSteps}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8E0D4]/60">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{ width: `${Math.round(holdProgress * 100)}%`, backgroundColor: '#DC2626' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
