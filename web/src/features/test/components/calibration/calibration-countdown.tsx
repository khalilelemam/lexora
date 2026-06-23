'use client';

import { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';
import { COUNTDOWN_SECONDS } from '../../lib/calibration-engine-constants';

interface CalibrationCountdownProps {
  countdown: number;
  resolvedMode: CalibrationVisualMode;
  audioEnabled: boolean;
  onToggleAudio: () => void;
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
    accentColor: '#51513d',
    icon: 'GRID',
  },
  stickman: {
    label: 'Ninja Mode',
    instruction: 'A ninja stickman will appear at random positions.',
    howTo: 'Lock your eyes on the target. Hold steady to capture each one.',
    accentColor: '#51513d',
    icon: 'NIN',
  },
  star: {
    label: 'Star Mode',
    instruction: 'A golden star will twinkle at different positions.',
    howTo: 'Follow the star with your eyes and hold your gaze on it until the ring fills.',
    accentColor: '#e3dc95',
    icon: 'STAR',
  },
};

/**
 * Premium, scroll-free countdown transition screen before calibration starts.
 *
 * Design decisions:
 * - Concentric calming target rings at the exact center of the viewport to focus gaze
 * - Seamless integration of the active target preview inside the countdown progress ring
 * - Pure Flexbox layout bounded to h-svh to prevent scrolling or clipping
 * - Calming pulsing and rotating motion representing active focus calibration
 */
export function CalibrationCountdown({
  countdown,
  resolvedMode,
  audioEnabled,
  onToggleAudio,
}: CalibrationCountdownProps) {
  const config = MODE_CONFIG[resolvedMode];

  return (
    <div className="fixed inset-0 z-50 flex h-svh w-full flex-col justify-between overflow-hidden bg-[#e3dcc2] p-6 select-none md:p-12">
      {/* Grid Overlay & Calming Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.05) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(166,168,103,0.12)_0%,_transparent_60%)]" />

      {/* Decorative architectural layout frames (matching login redesign) */}
      <div className="pointer-events-none absolute top-8 left-8 hidden h-12 w-12 border border-[#51513d]/10 md:block" />
      <div className="pointer-events-none absolute right-8 bottom-8 hidden h-16 w-16 border border-[#51513d]/10 md:block" />

      {/* Top Header */}
      <div className="relative z-10 flex w-full items-center justify-between border-b border-[#51513d]/10 pb-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center bg-[#1b2021]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e3dcc2"
              strokeWidth="2.5"
              className="h-4 w-4"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-widest text-[#1b2021] uppercase">
            Lexora
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleAudio}
          className="flex items-center gap-2 border border-[#51513d]/18 bg-[#f3edd7]/70 px-3 py-2 text-[#51513d] transition-colors hover:bg-[#e3dcc2]"
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? 'Turn calibration sound off' : 'Turn calibration sound on'}
        >
          {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a6a867]" />
          <span className="font-mono text-[9px] font-black tracking-wider text-[#51513d] uppercase">
            Sound {audioEnabled ? 'on' : 'off'}
          </span>
        </button>
      </div>

      {/* Center Area: Concentric Calming Target */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        {/* Concentric rings wrapper */}
        <div className="relative flex items-center justify-center">
          {/* Outer Dashed Rotating Ring (calming) */}
          <div className="absolute h-64 w-64 animate-[spin_40s_linear_infinite] rounded-full border border-dashed border-[#51513d]/15" />

          {/* Middle Accent Solid Ring */}
          <div className="absolute h-52 w-52 rounded-full border border-[#51513d]/8" />

          {/* Inner Glowing Aura */}
          <div className="absolute h-40 w-40 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-[#f3edd7]/60 shadow-[0_0_30px_rgba(166,168,103,0.15)]" />

          {/* Circular Countdown Progress Ring Wrapper */}
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-[#51513d]/10 bg-[#f3edd7] shadow-[inset_0_2px_8px_rgba(81,81,61,0.06)]">
            {/* SVG Countdown Ring */}
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke="rgba(81,81,61,0.04)"
                strokeWidth="3"
              />
              {/* Foreground progress circle */}
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke={config.accentColor === '#51513d' ? '#a6a867' : config.accentColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${74 * 2 * Math.PI}`}
                strokeDashoffset={`${74 * 2 * Math.PI * (1 - countdown / COUNTDOWN_SECONDS)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Target Canvas inside the progress ring */}
            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#51513d]/10 bg-[#e3dcc2]/30">
              <ModePreview mode={resolvedMode} accentColor={config.accentColor} />
            </div>
          </div>
        </div>

        {/* Big countdown indicator underneath */}
        <div className="mt-8 space-y-1 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-widest text-[#51513d]/60 uppercase">
              Starting In
            </span>
            <span className="animate-scale flex h-7 w-7 items-center justify-center rounded-full bg-[#1b2021] text-xs font-bold text-[#e3dcc2]">
              {countdown}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#1b2021] md:text-2xl">
            Prepare Your Focus
          </h2>
          <p className="max-w-xs text-[11px] leading-relaxed text-[#51513d]/80">
            Keep your head still and look directly at the target in the center.
          </p>
        </div>
      </div>

      {/* Bottom Instructions Card */}
      <div className="relative z-10 mx-auto w-full max-w-md border border-[#51513d]/15 bg-[#f3edd7]/95 p-5 shadow-[8px_8px_0_rgba(81,81,61,0.08)] backdrop-blur-sm">
        <div className="flex items-start gap-4">
          {/* Mini icon/indicator */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#51513d]/15 bg-[#e3dcc2]">
            {resolvedMode === 'grid' && (
              <svg
                className="h-5 w-5 text-[#51513d]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
            {resolvedMode === 'star' && (
              <svg className="h-5 w-5 text-[#a6a867]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            )}
            {resolvedMode === 'stickman' && (
              <svg
                className="h-5 w-5 text-[#51513d]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v8M9 10h6M10 20l2-5 2 5" />
              </svg>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-black tracking-wider text-[#1b2021] uppercase">
              Calibration Instructions
            </h3>
            <p className="text-[11px] leading-relaxed text-[#51513d]">{config.instruction}</p>
            <p className="text-[10px] leading-relaxed text-[#51513d]/70">
              <span className="font-bold text-[#1b2021]">Action: </span>
              {config.howTo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mode Preview — animated canvas showing the target ─────────────────── */

function ModePreview({ mode, accentColor }: { mode: CalibrationVisualMode; accentColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 112;
    const h = 112;
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

  return <canvas ref={canvasRef} className="block rounded-full" />;
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
  ctx.strokeStyle = 'rgba(81,81,61,0.15)';
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
  ctx.fillStyle = '#1b2021';
  ctx.fill();

  // Breathing glow
  const glow = 0.08 + Math.sin(t * 2.8) * 0.04;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(81,81,61,${glow})`;
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
  ctx.strokeStyle = '#1b2021';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Mask band
  ctx.fillStyle = '#1b2021';
  ctx.fillRect(cx - 8, ny - 22, 16, 5);

  // Eyes
  ctx.fillStyle = '#e3dcc2';
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
  ctx.strokeStyle = '#1b2021';
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
