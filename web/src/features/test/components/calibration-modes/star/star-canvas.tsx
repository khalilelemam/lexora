'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { CalibrationModeViewProps } from '../types';
import { getCalibrationAudio } from '../../../lib/calibration-audio';
import { cn } from '@/lib/utils';

/**
 * Star Canvas — calibration star mode
 *
 * Research-based design decisions:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Stars appear IN-PLACE at the target position (scale up from 0).
 *    Flying-in stars require tracking motion → child looks at the trail,
 *    not the final target. Appearing in-place ensures fixation is on
 *    the actual calibration point from the start.
 *    (Holmqvist & Andersson 2017: "target onset should coincide with fixation location")
 *
 * 2. NO background orbs / floating sparkles.
 *    Moving peripheral elements trigger involuntary saccades in children,
 *    which contaminate calibration samples.
 *    (Rayner 2009: peripheral motion draws gaze involuntarily)
 *
 * 3. Warm cream background (#FDF8F0) — must match test screen to prevent
 *    pupil size artifacts (PSA) that introduce systematic spatial bias.
 *    (Mathôt et al. 2013)
 *
 * 4. Amber/gold color palette — warm and engaging for children, stays
 *    within the cream-tone visual context.
 *
 * 5. NO "Look here!" text overlay — text near target creates a competing
 *    fixation stimulus at an unexpected eccentric location.
 *
 * 6. Uniform star size across all calibration points.
 *
 * Flow per point:
 *   'appearing'  → star scales from 0→1 at target (300ms)
 *   'collecting' → star bobs gently; progress ring fills as gaze holds
 *   'done'       → star sparkles outward and fades (300ms)
 *   'waiting'    → blank until parent triggers next point
 */

export interface StarCanvasProps extends CalibrationModeViewProps {
  gazeX: number;
  gazeY: number;
  onSampleCollected?: () => void;
}

type Phase = 'appearing' | 'collecting' | 'done' | 'waiting';

const APPEAR_MS = 350; // Scale-up duration
const COLLECT_HOLD_MS = 1800; // Time to hold gaze to complete point
const DONE_MS = 400; // Sparkle-fade duration

// 5-point star path helper
function drawStar5(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  rotation = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / 5 - Math.PI / 2 + rotation;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
}

interface StarState {
  phase: Phase;
  targetX: number;
  targetY: number;
  phaseStart: number;
  progressHeld: number; // 0 → 1
  collected: boolean;
  width: number;
  height: number;
  dpr: number;
}

export function StarCanvas({
  currentPoint,
  collectionStep,
  collectionTotal,
  isStableFixation,
  gazeX,
  gazeY,
  onSampleCollected,
}: StarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const gazeRef = useRef({ x: gazeX, y: gazeY });
  const stateRef = useRef<StarState | null>(null);
  const renderRef = useRef<((t: number) => void) | null>(null);
  const pointKeyRef = useRef('');
  const lastTimeRef = useRef(0);

  useEffect(() => {
    gazeRef.current = { x: gazeX, y: gazeY };
  }, [gazeX, gazeY]);

  const audio = useMemo(() => getCalibrationAudio(), []);

  /* ─── init state for a new target point ─────────────────────────── */
  const initPoint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    stateRef.current = {
      phase: 'appearing',
      targetX: currentPoint.x * w,
      targetY: currentPoint.y * h,
      phaseStart: 0, // set on first render frame
      progressHeld: 0,
      collected: false,
      width: w,
      height: h,
      dpr,
    };

    audio.play('magicSparkle');
  }, [currentPoint, audio]);

  /* ─── render loop ────────────────────────────────────────────────── */
  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const s = stateRef.current;
      if (!canvas || !s) {
        animRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const delta = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;

      // First frame — stamp phaseStart
      if (s.phaseStart === 0) s.phaseStart = time;

      const { width: w, height: h, dpr, targetX: tx, targetY: ty } = s;
      const elapsed = time - s.phaseStart;

      /* Clear */
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      /* Background — warm cream */
      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, 0, w, h);

      /* Very faint warm grid — same as grid mode, for visual consistency */
      ctx.strokeStyle = 'rgba(45,42,38,0.025)';
      ctx.lineWidth = 1;
      const gs = 40;
      for (let x = 0; x < w; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      /* ── APPEARING: scale up at target ── */
      if (s.phase === 'appearing') {
        const t = Math.min(1, elapsed / APPEAR_MS);
        // spring: overshoot then settle
        const spring = t < 0.6 ? (t / 0.6) * 1.15 : 1.15 - ((t - 0.6) / 0.4) * 0.15;
        drawStarAt(ctx, tx, ty, spring, 0, time, 0.4 + t * 0.5);
        if (t >= 1) {
          s.phase = 'collecting';
          s.phaseStart = time;
        }
      }

      /* ── COLLECTING: hold gaze to fill ring ── */
      if (s.phase === 'collecting') {
        const bob = Math.sin(time * 0.003) * 4;
        const rot = Math.sin(time * 0.0008) * 0.08;
        const gaze = gazeRef.current;
        const hitR = 50; // generous hit radius
        const dist = Math.hypot(gaze.x - tx, gaze.y - (ty + bob));
        const gazeOnTarget = isStableFixation || dist < hitR;

        if (gazeOnTarget) {
          s.progressHeld += delta / COLLECT_HOLD_MS;
          if (s.progressHeld >= 1 && !s.collected) {
            s.progressHeld = 1;
            s.collected = true;
            s.phase = 'done';
            s.phaseStart = time;
            audio.play('collect');
            onSampleCollected?.();
          }
        } else {
          // Gentle fade-back (not instant reset — reduces frustration)
          s.progressHeld = Math.max(0, s.progressHeld - delta / 1200);
        }

        const prog = s.progressHeld;
        const glow = 0.55 + prog * 0.45;

        drawStarAt(ctx, tx, ty + bob, 1.0, rot, time, glow);

        // Progress ring
        const ringR = 40;
        // Track background
        ctx.beginPath();
        ctx.arc(tx, ty + bob, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212,160,23,0.18)';
        ctx.lineWidth = 5;
        ctx.stroke();
        // Filled arc
        if (prog > 0) {
          ctx.beginPath();
          ctx.arc(tx, ty + bob, ringR, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
          ctx.strokeStyle = `rgba(212,160,23,${0.7 + prog * 0.3})`;
          ctx.lineCap = 'round';
          ctx.lineWidth = 5;
          ctx.stroke();
        }

        // Gaze-on indicator: subtle amber pulse around ring when gaze on target
        if (gazeOnTarget) {
          ctx.beginPath();
          ctx.arc(tx, ty + bob, ringR + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212,160,23,${0.15 + Math.sin(time * 0.008) * 0.08})`;
          ctx.lineWidth = 8;
          ctx.stroke();
        }
      }

      /* ── DONE: sparkle fade ── */
      if (s.phase === 'done') {
        const t = Math.min(1, elapsed / DONE_MS);
        const scale = 1 + t * 0.4;
        const opacity = 1 - t;

        ctx.globalAlpha = opacity;
        drawStarAt(ctx, tx, ty, scale, t * Math.PI * 0.5, time, 1.0);
        ctx.globalAlpha = 1;

        // Sparkle burst — 8 rays
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + t;
          const dist2 = t * 60;
          const sx = tx + Math.cos(angle) * dist2;
          const sy = ty + Math.sin(angle) * dist2;
          ctx.globalAlpha = (1 - t) * 0.8;
          ctx.fillStyle = '#D4A017';
          ctx.beginPath();
          ctx.arc(sx, sy, 3 * (1 - t), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        if (t >= 1) s.phase = 'waiting';
      }

      /* ── WAITING ── (blank, engine will trigger next point) */

      animRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    },
    [isStableFixation, audio, onSampleCollected],
  );

  /* ─── keep render ref fresh ─────────────────────────────────────── */
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  /* ─── react to point changes ────────────────────────────────────── */
  useEffect(() => {
    const key = `${currentPoint.x}:${currentPoint.y}:${collectionStep}`;
    if (key === pointKeyRef.current) return;
    pointKeyRef.current = key;
    lastTimeRef.current = 0;
    initPoint();
  }, [currentPoint, collectionStep, initPoint]);

  /* ─── start loop ────────────────────────────────────────────────── */
  useEffect(() => {
    initPoint();
    const onResize = () => initPoint();
    window.addEventListener('resize', onResize);
    animRef.current = requestAnimationFrame((t) => renderRef.current?.(t));
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animRef.current);
    };
  }, [initPoint]);

  return (
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Bottom HUD strip */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E8E0D4] bg-white/55 px-3 py-1.5 text-[11px] text-[#8B857E] backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Star Mode
        </div>

        {/* Star collection tally — each point is a star icon */}
        <div className="flex items-center gap-0.5 rounded-lg border border-[#E8E0D4] bg-white/55 px-2.5 py-1 backdrop-blur-sm">
          {Array.from({ length: collectionTotal }).map((_, idx) => {
            const active = idx === collectionStep - 1;
            const done = idx < collectionStep - 1;
            return (
              <svg
                key={idx}
                className={cn(
                  'transition-all duration-300',
                  done ? 'h-3.5 w-3.5' : active ? 'h-4 w-4' : 'h-3 w-3',
                  active && 'animate-pulse',
                )}
                viewBox="0 0 24 24"
                fill={done ? '#F59E0B' : active ? '#D97706' : 'none'}
                stroke={done ? '#D97706' : active ? '#B45309' : '#D4CBBD'}
                strokeWidth={done ? 0 : active ? 1.5 : 1.5}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            );
          })}
        </div>

        <div className="rounded-lg border border-[#E8E0D4] bg-white/55 px-3 py-1.5 text-[11px] backdrop-blur-sm">
          <span className="font-semibold text-amber-600">{collectionStep}</span>
          <span className="text-[#C4BDB4]"> / </span>
          <span className="text-[#6B6560]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Drawing helper — draws a 5-pointed star at (cx, cy) ────────── */
function drawStarAt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  rotation: number,
  time: number,
  glowAlpha: number,
) {
  const outer = 28 * scale;
  const inner = 11 * scale;

  // Outer glow
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer * 2.2);
  grd.addColorStop(0, `rgba(212,160,23,${glowAlpha * 0.35})`);
  grd.addColorStop(0.5, `rgba(212,160,23,${glowAlpha * 0.12})`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, outer * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Star body gradient
  const bodyGrd = ctx.createRadialGradient(cx, cy - outer * 0.3, 0, cx, cy, outer);
  bodyGrd.addColorStop(0, '#FEF3C7');
  bodyGrd.addColorStop(0.45, '#F59E0B');
  bodyGrd.addColorStop(1, '#B45309');
  ctx.fillStyle = bodyGrd;
  drawStar5(ctx, cx, cy, outer, inner, rotation);
  ctx.fill();

  // Shimmer highlight
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + Math.sin(time * 0.006) * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
