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
          x1="18" y1="15" x2="101" y2="98"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FEF3C7" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
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
 * - No boss point — uniform star size for all points
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
    <div className="z-50 fixed inset-0 bg-[#FDF8F0] overflow-hidden">
      {/* Subtle warm radial accents — static, no motion to avoid saccades */}
      <div
        className="absolute inset-0 pointer-events-none"
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
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className={cn(
            'relative flex justify-center items-center rounded-full transition-all duration-200',
            'h-24 w-24 bg-amber-50/40 border-2 border-amber-200/60',
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
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="3" />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={isStableFixation ? '#10b981' : '#D97706'}
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
              className="-top-7 absolute bg-amber-500 px-2.5 py-1 rounded-md font-semibold text-white text-[11px] pointer-events-none shadow-sm"
            >
              ✨ Got it!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom HUD strip — outside calibration area */}
      <div className="bottom-0 left-0 right-0 absolute flex justify-between items-center px-5 h-14 pointer-events-none">
        {/* Mode label */}
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-[#E8E0D4] rounded-lg text-[#8B857E] text-[11px]">
          <div className="bg-amber-400 rounded-full w-1.5 h-1.5" />
          Star Mode
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: collectionTotal }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-full transition-all duration-300',
                idx < collectionStep - 1
                  ? 'w-2 h-2 bg-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.4)]'
                  : idx === collectionStep - 1
                    ? 'w-2.5 h-2.5 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse'
                    : 'w-1.5 h-1.5 bg-[#D4CBBD]/60',
              )}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="bg-white/60 backdrop-blur-sm px-3 py-1.5 border border-[#E8E0D4] rounded-lg text-[11px]">
          <span className="font-semibold text-amber-600">{collectionStep}</span>
          <span className="text-[#C4BDB4]"> / </span>
          <span className="text-[#6B6560]">{collectionTotal}</span>
        </div>
      </div>
    </div>
  );
}
