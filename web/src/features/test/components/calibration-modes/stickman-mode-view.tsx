'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

function StickmanFigure({ boss }: { boss: boolean }) {
  return (
    <svg width={boss ? 108 : 86} height={boss ? 108 : 86} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="24" r="12" stroke="currentColor" strokeWidth="5" />
      <path d="M60 36V68" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 46L36 58" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 46L84 58" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 68L42 96" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 68L78 96" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="55" cy="21" r="1.5" fill="currentColor" />
      <circle cx="65" cy="21" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function StickmanModeView({
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
    <div className="z-50 fixed inset-0 bg-[repeating-linear-gradient(0deg,rgba(100,116,139,0.07),rgba(100,116,139,0.07)_1px,transparent_1px,transparent_28px),repeating-linear-gradient(90deg,rgba(100,116,139,0.06),rgba(100,116,139,0.06)_1px,transparent_1px,transparent_28px),hsl(210_24%_97%)] overflow-hidden">
      <div className="top-4 left-4 absolute bg-white/80 backdrop-blur-sm px-3 py-2 border rounded-md text-slate-700 text-sm pointer-events-none">
        Action Stickman Mode
      </div>

      <div className="top-4 right-4 absolute bg-white/80 backdrop-blur-sm px-3 py-2 border rounded-md text-slate-700 text-sm pointer-events-none">
        Defeated {Math.max(0, collectionStep - 1)} / {collectionTotal}
      </div>

      <motion.div
        key={`stickman-${collectionStep}`}
        initial={{
          left: `${previousPoint.x * 100}%`,
          top: `${previousPoint.y * 100}%`,
          rotate: -14,
          opacity: 0.72,
        }}
        animate={{
          left: `${currentPoint.x * 100}%`,
          top: `${currentPoint.y * 100}%`,
          rotate: [0, 3, -2, 0],
          opacity: 1,
        }}
        transition={{ duration: motionDurationMs / 1000, ease: 'easeInOut' }}
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className={cn(
            'relative flex justify-center items-center border-2 rounded-full text-slate-900 transition-all duration-200',
            isBossPoint
              ? 'h-28 w-28 border-red-500/80 bg-red-200/20'
              : 'h-22 w-22 border-slate-500/70 bg-slate-200/30',
            isStableFixation && 'shadow-[0_0_35px_rgba(244,63,94,0.35)]',
            capturePulse && 'scale-110',
          )}
        >
          <motion.div
            animate={{
              y: isStableFixation ? [0, -1, 0] : [0, -4, 0],
            }}
            transition={{
              duration: isStableFixation ? 0.6 : 0.35,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          >
            <StickmanFigure boss={isBossPoint} />
          </motion.div>

          {isStableFixation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="top-[34%] left-[42%] absolute bg-red-500/80 w-14 h-0.5" />
              <div className="top-[38%] left-[44%] absolute bg-red-400/80 w-14 h-0.5" />
            </motion.div>
          )}

          <motion.div
            className="absolute inset-0 border-2 border-emerald-500 rounded-full"
            animate={{
              opacity: 0.2 + fixationProgress * 0.8,
              scale: 1 + fixationProgress * 0.45,
            }}
          />

          {capturePulse && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: -16 }}
              exit={{ opacity: 0 }}
              className="-top-8 absolute bg-slate-900 px-2 py-1 rounded-md font-semibold text-white text-xs pointer-events-none"
            >
              Defeated!
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
