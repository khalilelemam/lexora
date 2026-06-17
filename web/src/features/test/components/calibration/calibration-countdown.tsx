'use client';

import { useEffect, useRef } from 'react';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';
import { COUNTDOWN_SECONDS } from '../../lib/calibration-engine-constants';

interface CalibrationCountdownProps {
  countdown: number;
  resolvedMode: CalibrationVisualMode;
}

const MODE_CONFIG: Record<
  CalibrationVisualMode,
  {
    label: string;
    instruction: string;
    howTo: string;
    accentColor: string;
    icon: string;
  }
> = {
  grid: {
    label: 'Grid Mode',
    instruction: 'A dot will appear at different positions on screen.',
    howTo:
      'Follow each dot with your eyes and hold your gaze steady until the ring fills completely.',
    accentColor: '#4A7C59',
    icon: '◉',
  },
  stickman: {
    label: 'Ninja Mode',
    instruction: 'A ninja stickman will appear at random positions.',
    howTo:
      'Lock your eyes on the ninja — your gaze is your weapon! Hold steady to capture each one.',
    accentColor: '#DC2626',
    icon: '🥷',
  },
  star: {
    label: 'Star Mode',
    instruction: 'A golden star will twinkle at different positions.',
    howTo: 'Follow the star with your eyes and hold your gaze on it until the ring fills.',
    accentColor: '#D97706',
    icon: '⭐',
  },
};

/**
 * Pre-calibration countdown with mode-specific instructions and live preview.
 *
 * Design decisions:
 * - 5 second countdown — gives children time to read and prepare
 * - Mode-specific instructions explain what to expect
 * - Animated mini preview shows what the target looks like (canvas-based)
 * - "Move only your eyes" reminder at the bottom
 */
export function CalibrationCountdown({ countdown, resolvedMode }: CalibrationCountdownProps) {
  const config = MODE_CONFIG[resolvedMode];

  return (
    <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-[#FDF8F0]">
      <div
        className="flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-[#E8E0D4] bg-white/80 px-10 py-8 shadow-lg backdrop-blur-sm"
        style={{ animation: 'float-up 0.4s ease-out' }}
      >
        <h2 className="text-2xl font-bold tracking-tight text-[#2D2A26]">Get Ready</h2>

        {/* Mode badge */}
        <div className="flex items-center gap-2 rounded-full border border-[#E8E0D4] bg-white px-4 py-1.5">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium" style={{ color: config.accentColor }}>
            {config.label}
          </span>
        </div>

        {/* Instructions */}
        <div className="max-w-sm space-y-2 text-center">
          <p className="text-sm leading-relaxed text-[#6B6560]">{config.instruction}</p>
          <p className="text-xs leading-relaxed text-[#8B857E]">
            <span className="font-medium text-[#2D2A26]">How: </span>
            {config.howTo}
          </p>
        </div>

        {/* Mini animated preview — shows what the target looks like */}
        <ModePreview mode={resolvedMode} accentColor={config.accentColor} />

        {/* Countdown ring */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="44" fill="none" stroke="#E8E0D4" strokeWidth="4" />
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke={config.accentColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${44 * 2 * Math.PI}`}
              strokeDashoffset={`${44 * 2 * Math.PI * (1 - countdown / COUNTDOWN_SECONDS)}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <span className="text-3xl font-bold" style={{ color: config.accentColor }}>
            {countdown}
          </span>
        </div>

        <p className="text-xs text-[#8B857E]">Keep your head still — move only your eyes</p>
      </div>
    </div>
  );
}

/* ─── Mode Preview — animated canvas showing the target ─────────────────── */

/**
 * Tiny canvas-based animated preview that demonstrates what the calibration
 * target looks like for each mode. Loops continuously during the countdown.
 *
 * - Grid: dot with progress ring filling
 * - Star: golden star with shimmer
 * - Stickman: simple ninja stickman with headband
 */
function ModePreview({ mode, accentColor }: { mode: CalibrationVisualMode; accentColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 200;
    const h = 80;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const startTime = performance.now();

    function render(now: number) {
      const t = (now - startTime) / 1000;
      ctx!.clearRect(0, 0, w, h);

      if (mode === 'grid') {
        drawGridPreview(ctx!, cx, cy, t, accentColor);
      } else if (mode === 'star') {
        drawStarPreview(ctx!, cx, cy, t);
      } else {
        drawNinjaPreview(ctx!, cx, cy, t);
      }

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [mode, accentColor]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E0D4] bg-[#FDF8F0]">
      <canvas ref={canvasRef} className="block" />
      <p className="pb-1.5 text-center text-[9px] text-[#A09890]">Preview</p>
    </div>
  );
}

function drawGridPreview(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  color: string,
) {
  // Animated progress ring (loops every 2s)
  const progress = (t % 2) / 2;
  const radius = 20;

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(74,124,89,0.15)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Progress arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#2D2A26';
  ctx.fill();

  // Breathing glow
  const glow = 0.08 + Math.sin(t * 2.8) * 0.04;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(74,124,89,${glow})`;
  ctx.fill();
}

function drawStarPreview(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const scale = 0.85 + Math.sin(t * 3) * 0.1;
  const rotation = t * 0.3;
  const outer = 18 * scale;
  const inner = 7 * scale;

  // Glow
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer * 2);
  grd.addColorStop(0, `rgba(212,160,23,${0.2 + Math.sin(t * 2) * 0.1})`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, outer * 2, 0, Math.PI * 2);
  ctx.fill();

  // Star body
  const bodyGrd = ctx.createRadialGradient(cx, cy - outer * 0.3, 0, cx, cy, outer);
  bodyGrd.addColorStop(0, '#FEF3C7');
  bodyGrd.addColorStop(0.45, '#F59E0B');
  bodyGrd.addColorStop(1, '#B45309');
  ctx.fillStyle = bodyGrd;

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / 5 - Math.PI / 2 + rotation;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();

  // Shimmer stroke
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + Math.sin(t * 4) * 0.2})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Progress ring
  const progress = (t % 2) / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, outer + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = '#D4A017';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawNinjaPreview(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const bob = Math.sin(t * 2.5) * 2;
  const ny = cy + bob;

  // Head
  ctx.beginPath();
  ctx.arc(cx, ny - 18, 9, 0, Math.PI * 2);
  ctx.strokeStyle = '#2D2A26';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Mask band
  ctx.fillStyle = '#2D2A26';
  ctx.fillRect(cx - 8, ny - 22, 16, 5);

  // Eyes
  ctx.fillStyle = '#FDF8F0';
  ctx.beginPath();
  ctx.arc(cx - 3, ny - 20.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, ny - 20.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Headband ribbon tails
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  const ribbonSway = Math.sin(t * 4) * 3;
  ctx.beginPath();
  ctx.moveTo(cx + 9, ny - 20);
  ctx.quadraticCurveTo(cx + 16, ny - 18 + ribbonSway, cx + 20, ny - 15 + ribbonSway);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 9, ny - 18);
  ctx.quadraticCurveTo(cx + 14, ny - 16 - ribbonSway * 0.7, cx + 18, ny - 12 - ribbonSway * 0.5);
  ctx.stroke();

  // Body
  ctx.strokeStyle = '#2D2A26';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, ny - 9);
  ctx.lineTo(cx, ny + 14);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(cx, ny - 3);
  ctx.lineTo(cx - 14, ny + 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, ny - 3);
  ctx.lineTo(cx + 13, ny - 8);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(cx, ny + 14);
  ctx.lineTo(cx - 10, ny + 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, ny + 14);
  ctx.lineTo(cx + 11, ny + 27);
  ctx.stroke();

  // Scan ring (pulsing)
  const pulse = 0.5 + Math.sin(t * 3) * 0.3;
  ctx.beginPath();
  ctx.arc(cx, ny, 30, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(220,38,38,${pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}
