'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

const ORB_DECOR = [
  { left: 9, top: 18, size: 8, delay: 0.1 },
  { left: 21, top: 72, size: 7, delay: 0.35 },
  { left: 35, top: 31, size: 6, delay: 0.65 },
  { left: 52, top: 66, size: 5, delay: 0.42 },
  { left: 67, top: 22, size: 7, delay: 0.23 },
  { left: 84, top: 58, size: 6, delay: 0.74 },
];

function StarShape({ boss }: { boss: boolean }) {
  return (
    <svg width={boss ? 116 : 88} height={boss ? 116 : 88} viewBox="0 0 120 120" fill="none">
      <path
        d="M60 12L72 44L106 44L78 64L88 98L60 78L32 98L42 64L14 44L48 44L60 12Z"
        fill="url(#star-gradient)"
        stroke="rgba(255,255,255,0.72)"
        strokeWidth="3"
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
          <stop stopColor="#fef9c3" />
          <stop offset="0.52" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function StarModeView({
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
  const chestFill = Math.round(((collectionStep - 1) / Math.max(1, collectionTotal)) * 100);

  return (
    <div className="z-50 fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(253,224,71,0.3),transparent_38%),radial-gradient(circle_at_75%_75%,rgba(244,114,182,0.25),transparent_42%),repeating-linear-gradient(0deg,rgba(148,163,184,0.05),rgba(148,163,184,0.05)_1px,transparent_1px,transparent_30px),hsl(206_40%_97%)] overflow-hidden">
      <div className="top-4 left-4 absolute bg-white/75 backdrop-blur-sm px-3 py-2 border rounded-md text-slate-700 text-sm pointer-events-none">
        Gentle Star Collector Mode
      </div>

      <div className="top-4 right-4 absolute bg-white/75 backdrop-blur-sm px-3 py-2 border rounded-md text-slate-700 text-sm pointer-events-none">
        Stars collected {Math.max(0, collectionStep - 1)} / {collectionTotal}
      </div>

      {ORB_DECOR.map((orb, index) => (
        <motion.div
          key={`orb-${index}`}
          className="absolute bg-white/60 rounded-full pointer-events-none"
          style={{ left: `${orb.left}%`, top: `${orb.top}%`, width: orb.size, height: orb.size }}
          animate={{ y: [0, -8, 0], opacity: [0.3, 0.95, 0.3] }}
          transition={{
            duration: 2.6,
            repeat: Number.POSITIVE_INFINITY,
            delay: orb.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      <motion.div
        key={`star-target-${collectionStep}`}
        initial={{
          left: `${previousPoint.x * 100}%`,
          top: `${previousPoint.y * 100}%`,
          opacity: 0.55,
        }}
        animate={{ left: `${currentPoint.x * 100}%`, top: `${currentPoint.y * 100}%`, opacity: 1 }}
        transition={{ duration: motionDurationMs / 1000, ease: 'easeInOut' }}
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className={cn(
            'relative flex justify-center items-center border-2 border-yellow-200/90 rounded-full transition-all duration-200',
            isBossPoint ? 'h-30 w-30 bg-pink-100/30' : 'h-24 w-24 bg-yellow-100/35',
            capturePulse && 'scale-110',
          )}
        >
          <motion.div
            animate={{
              rotate: [0, 5, 0, -5, 0],
              y: isStableFixation ? [0, -1, 0] : [0, -6, 0],
            }}
            transition={{
              duration: isStableFixation ? 1.1 : 0.75,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          >
            <StarShape boss={isBossPoint} />
          </motion.div>

          <motion.div
            className="absolute inset-0 border-2 border-emerald-400 rounded-full"
            animate={{ opacity: 0.2 + fixationProgress * 0.8, scale: 1 + fixationProgress * 0.42 }}
          />

          {capturePulse && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: -14 }}
              className="-top-8 absolute bg-emerald-600 px-2 py-1 rounded-md font-semibold text-white text-xs pointer-events-none"
            >
              Yay!
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="bottom-4 left-1/2 absolute bg-white/75 backdrop-blur-sm p-3 border border-amber-200/80 rounded-xl w-[min(420px,88vw)] -translate-x-1/2 pointer-events-none">
        <p className="mb-2 font-medium text-slate-700 text-sm text-center">Treasure Chest</p>
        <div className="relative bg-amber-100/60 border border-amber-300/70 rounded-md h-5 overflow-hidden">
          <motion.div
            className="left-0 absolute inset-y-0 bg-linear-to-r from-yellow-300 via-amber-300 to-pink-300 rounded-md"
            animate={{ width: `${chestFill}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
