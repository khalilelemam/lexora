'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

function StarShape() {
  return (
    <svg width={80} height={80} viewBox="0 0 120 120" fill="none">
      <path
        d="M60 12L72 44L106 44L78 64L88 98L60 78L32 98L42 64L14 44L48 44L60 12Z"
        fill="url(#star-gradient)"
        stroke="rgba(212,160,23,0.5)"
        strokeWidth="2"
      />
      <defs>
        <linearGradient
          id="star-gradient"
          x1="18"
          y1="15"
          x2="101"
          y2="98"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FEF3C7" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#8b6f25" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Star (Gentle) calibration mode.
 *
 * Research decisions:
 * - Warm cream background matching test environment (PSA prevention)
 * - Stars appear in-place with twinkle animation (not flying)
 * - Golden/amber tones — warm and engaging for younger children
 * - Sparkle decorations REMOVED — research shows moving peripheral elements
 *   attract involuntary saccades in children, degrading calibration accuracy
 *   (Holmqvist & Andersson 2017: "minimize peripheral visual transients")
 * - HUD moved to bottom strip to keep calibration area completely clear
 */
export function StarModeView({
  currentPoint,
  collectionStep,
  collectionTotal,
  fixationProgress,
  isStableFixation,
  capturePulse,
  motionDurationMs,
}: CalibrationModeViewProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#e3dcc2]">
      {/* Subtle warm radial accents — static, no motion to avoid saccades */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(251,191,36,0.06), transparent 38%),' +
            'radial-gradient(circle at 75% 75%, rgba(245,158,11,0.04), transparent 42%)',
        }}
      />

      {/* Active star target */}
      <motion.div
        key={`star-target-${collectionStep}`}
        initial={{
          left: `${currentPoint.x * 100}%`,
          top: `${currentPoint.y * 100}%`,
          opacity: 0,
          scale: 0,
          rotate: -45,
        }}
        animate={{
          left: `${currentPoint.x * 100}%`,
          top: `${currentPoint.y * 100}%`,
          opacity: 1,
          scale: [0, 1.15, 1],
          rotate: [-45, 10, 0],
        }}
        transition={{
          duration: motionDurationMs / 1000,
          ease: [0.34, 1.56, 0.64, 1], // spring overshoot for twinkle feel
          scale: { duration: motionDurationMs / 1000, times: [0, 0.6, 1] },
          rotate: { duration: motionDurationMs / 1000, times: [0, 0.6, 1] },
        }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full transition-all duration-200',
            'h-24 w-24 border-2 border-[#e3dc95]/60 bg-[#e3dc95]/25',
            capturePulse && 'scale-110',
          )}
        >
          {/* Star with gentle wobble */}
          <motion.div
            animate={{
              rotate: [0, 5, 0, -5, 0],
              y: isStableFixation ? [0, -1, 0] : [0, -4, 0],
            }}
            transition={{
              duration: isStableFixation ? 1.2 : 0.75,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          >
            <StarShape />
          </motion.div>

          {/* Progress ring */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(245,158,11,0.12)"
              strokeWidth="3"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isStableFixation ? '#a6a867' : '#8b6f25'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={264}
              animate={{ strokeDashoffset: 264 * (1 - fixationProgress) }}
              transition={{ duration: 0.1 }}
            />
          </svg>

          {/* Capture feedback */}
          {capturePulse && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: -14 }}
              className="pointer-events-none absolute -top-7 rounded-md bg-[#e3dc95]/250 px-2.5 py-1 text-[11px] font-semibold text-[#f3edd7] shadow-sm"
            >
              ✨ Got it!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom HUD strip — outside calibration area */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between px-5">
        {/* Mode label */}
        <div className="flex items-center gap-2 rounded-lg border border-[#51513d] bg-[#f3edd7]/75 px-3 py-1.5 text-[11px] text-[#51513d] backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-[#e3dc95]" />
          Star Mode
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: collectionTotal }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-full transition-all duration-300',
                idx < collectionStep - 1
                  ? 'h-2 w-2 bg-[#e3dc95] shadow-[0_0_5px_rgba(227,220,149,0.5)]'
                  : idx === collectionStep - 1
                    ? 'h-2.5 w-2.5 animate-pulse bg-[#e3dc95]/250 shadow-[0_0_6px_rgba(227,220,149,0.55)]'
                    : 'h-1.5 w-1.5 bg-[#51513d]/60',
              )}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="rounded-lg border border-[#51513d] bg-[#f3edd7]/75 px-3 py-1.5 text-[11px] backdrop-blur-sm">
          <span className="font-semibold text-[#8b6f25]">{collectionStep}</span>
          <span className="text-[#51513d]"> / </span>
          <span className="text-[#51513d]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
