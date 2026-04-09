'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

export function GridModeView({
  points,
  currentPoint,
  previousPoint,
  collectionStep,
  collectionTotal,
  isBossPoint,
  fixationProgress,
  isStableFixation,
  capturePulse,
  motionDurationMs,
}: CalibrationModeViewProps) {
  return (
    <div className="z-50 fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/0.08),transparent_40%),radial-gradient(circle_at_78%_82%,hsl(var(--primary)/0.06),transparent_45%),repeating-linear-gradient(0deg,rgba(120,120,120,0.04),rgba(120,120,120,0.04)_1px,transparent_1px,transparent_28px),repeating-linear-gradient(90deg,rgba(120,120,120,0.03),rgba(120,120,120,0.03)_1px,transparent_1px,transparent_28px),linear-gradient(180deg,#faf9f7_0%,#f5f4f1_100%)] overflow-hidden">
      {/* Mode label */}
      <div className="top-4 left-4 absolute flex items-center gap-2 bg-white/85 backdrop-blur-sm px-3 py-2 border border-slate-200/60 rounded-lg shadow-sm text-slate-600 text-sm pointer-events-none">
        <div className="bg-blue-500 rounded-full w-2 h-2 animate-pulse" />
        Grid Mode
      </div>

      {/* Progress counter */}
      <div className="top-4 right-4 absolute bg-white/85 backdrop-blur-sm px-3 py-2 border border-slate-200/60 rounded-lg shadow-sm text-slate-700 text-sm pointer-events-none">
        <span className="font-medium text-blue-600">{collectionStep}</span>
        <span className="text-slate-400"> / </span>
        <span>{collectionTotal}</span>
      </div>

      {/* Grid point markers */}
      {points.map((point, index) => {
        const isPast = index < collectionStep - 1;
        const isActive = index === collectionStep - 1;

        return (
          <motion.div
            key={`grid-point-${index}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.02, duration: 0.25, ease: 'easeOut' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          >
            <div
              className={cn(
                'rounded-full transition-all duration-300',
                isPast && 'h-3 w-3 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
                !isPast && !isActive && 'h-2.5 w-2.5 bg-slate-300/60 border border-slate-400/30',
                isActive && 'h-4 w-4 bg-blue-400/50 border-2 border-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.4)]',
              )}
            />
            {/* Checkmark for completed points */}
            {isPast && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="-top-0.5 -right-0.5 absolute bg-emerald-500 rounded-full w-2 h-2 flex justify-center items-center"
              >
                <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Active target with animation */}
      <motion.div
        key={`grid-target-${collectionStep}`}
        initial={{
          left: `${previousPoint.x * 100}%`,
          top: `${previousPoint.y * 100}%`,
          opacity: 0.4,
          scale: 0.85,
        }}
        animate={{
          left: `${currentPoint.x * 100}%`,
          top: `${currentPoint.y * 100}%`,
          opacity: 1,
          scale: 1,
        }}
        transition={{ duration: motionDurationMs / 1000, ease: [0.4, 0, 0.2, 1] }}
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className={cn(
            'relative flex justify-center items-center rounded-full transition-all duration-200',
            isBossPoint ? 'h-24 w-24' : 'h-18 w-18',
          )}
        >
          {/* Outer glow ring */}
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full',
              isStableFixation
                ? 'bg-emerald-400/15 shadow-[0_0_30px_rgba(52,211,153,0.35)]'
                : 'bg-blue-400/10 shadow-[0_0_25px_rgba(59,130,246,0.25)]',
            )}
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Target border */}
          <div
            className={cn(
              'absolute inset-2 rounded-full border-2 transition-colors duration-200',
              isBossPoint ? 'border-amber-400/80' : 'border-blue-400/70',
            )}
          />

          {/* Inner rings */}
          <div
            className={cn(
              'absolute inset-4 rounded-full border transition-colors duration-200',
              isStableFixation ? 'border-emerald-400/50' : 'border-blue-300/40',
            )}
          />

          {/* Center dot */}
          <div
            className={cn(
              'relative z-10 rounded-full transition-all duration-200',
              isBossPoint ? 'w-5 h-5' : 'w-4 h-4',
              isStableFixation ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-white shadow-md',
            )}
          />

          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(59, 130, 246, 0.15)"
              strokeWidth="4"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isStableFixation ? '#10b981' : '#3b82f6'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={264}
              animate={{
                strokeDashoffset: 264 * (1 - fixationProgress),
              }}
              transition={{ duration: 0.1 }}
            />
          </svg>

          {/* Capture pulse effect */}
          <AnimatePresence>
            {capturePulse && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute inset-0 bg-emerald-400/30 rounded-full"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom progress bar */}
      <div className="bottom-6 left-1/2 absolute flex gap-2 -translate-x-1/2 pointer-events-none">
        {Array.from({ length: collectionTotal }).map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.02 }}
            className={cn(
              'rounded-full transition-all duration-300',
              idx < collectionStep - 1
                ? 'w-2.5 h-2.5 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                : idx === collectionStep - 1
                  ? 'w-3 h-3 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse'
                  : 'w-2 h-2 bg-slate-300/60',
            )}
          />
        ))}
      </div>
    </div>
  );
}
