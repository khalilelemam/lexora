'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CalibrationModeViewProps } from './types';

/**
 * Optimized Grid (Default) Calibration Page.
 *
 * Refined Animation lifecycle:
 * 1. Instant Spawn: target appears instantly at its full size (scale: 1, opacity: 1).
 * 2. Smooth Continuous Shrink: immediately begins a smooth linear shrink to scale: 0.
 *    - Uses hardware-accelerated 'scale' transform animation only.
 * 3. Instant Handoff: triggers onSampleCollected instantly when scale hits 0.
 *
 * Performance Optimization:
 * - Wrapped in React.memo with a custom comparison function to ignore rapid gaze coordinate
 *   movements (gazeX, gazeY) and raw fixation progress updates. This reduces re-renders
 *   during the shrink animation to absolute zero, guaranteeing 60fps frame-rate smoothness.
 */
export const GridModeView = React.memo(
  function GridModeView({
    points,
    currentPoint,
    collectionStep,
    collectionTotal,
    isStableFixation,
    capturePulse,
    onSampleCollected,
  }: CalibrationModeViewProps) {
    // Which index is currently active (0-based)
    const activeIndex = collectionStep - 1;

    const animationDuration = 2.4; // 2.4 seconds total tracking duration

    return (
      <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#e3dcc2] select-none">
        {/* 1. Backdrop Grid Overlay */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(81,81,61,.05) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* 2. Interactive Coordinate-Tracking Glow */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-out pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${currentPoint.x * 100}% ${currentPoint.y * 100}%, rgba(166,168,103,0.22), transparent 22rem)`,
          }}
        />

        {/* Decorative Minimal Corner Borders */}
        <div className="absolute top-6 left-6 hidden h-8 w-8 border border-[#51513d]/10 md:block pointer-events-none" />
        <div className="absolute bottom-24 right-6 hidden h-8 w-8 border border-[#51513d]/10 md:block pointer-events-none" />

        {/* 3. Completed Point Markers (calibrated history) */}
        {collectionTotal === points.length &&
          points.map((point, index) => {
            if (index >= activeIndex) return null;
            return (
              <div
                key={`grid-done-${index}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              >
                <div className="relative flex h-3 w-3 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-[#a6a867]/20 bg-[#a6a867]/10" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#a6a867]/60" />
                </div>
              </div>
            );
          })}

        {/* 4. Upcoming Point Hints (subtle anticipation) */}
        {collectionTotal === points.length &&
          points.map((point, index) => {
            if (index <= activeIndex) return null;
            return (
              <div
                key={`grid-future-${index}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              >
                <div className="h-1 w-1 rounded-full bg-[#51513d]/25" />
              </div>
            );
          })}

        {/* 5. Active Target (Instant Spawn -> Smooth Continuous Shrink) */}
        <motion.div
          key={`grid-target-${collectionStep}`}
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 0 }}
          transition={{
            duration: animationDuration,
            ease: 'linear',
          }}
          onAnimationComplete={() => {
            onSampleCollected?.();
          }}
          style={{
            left: `${currentPoint.x * 100}%`,
            top: `${currentPoint.y * 100}%`,
          }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full">
            {/* Breathing Glow Aura */}
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full',
                isStableFixation
                  ? 'bg-[#a6a867]/15 shadow-[0_0_24px_rgba(166,168,103,0.24)]'
                  : 'bg-[#a6a867]/6 shadow-[0_0_16px_rgba(166,168,103,0.16)]',
              )}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Solid Accent Ring */}
            <div className="absolute inset-2 rounded-full border border-[#a6a867]/30 transition-colors duration-200" />

            {/* Calibration Target Dot (Sage on stable, Dark Charcoal on moving) */}
            <div
              className={cn(
                'relative z-10 h-4.5 w-4.5 rounded-full transition-all duration-200 border border-[#e3dcc2]',
                isStableFixation
                  ? 'bg-[#a6a867] shadow-[0_0_12px_rgba(166,168,103,0.65)] scale-110'
                  : 'bg-[#1b2021] shadow-sm',
              )}
            />

            {/* Circular Fixation Progress Arc (synchronized with continuous shrink) */}
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="rgba(81,81,61,0.03)"
                strokeWidth="2.5"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#a6a867"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={276.5}
                initial={{ strokeDashoffset: 276.5 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{
                  duration: animationDuration,
                  ease: 'linear',
                }}
              />
            </svg>

            {/* Capture Success Ripple */}
            <AnimatePresence>
              {capturePulse && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 2.3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-[#a6a867]/30"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 6. Floating HUD Bar (bottom) */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-24 items-end justify-between px-6 pb-6">
          {/* Active Mode Label */}
          <div className="flex items-center gap-2 border border-[#51513d]/15 bg-[#f3edd7]/90 px-3 py-2 text-[10px] font-black tracking-widest text-[#51513d] uppercase shadow-[4px_4px_0_rgba(81,81,61,0.05)] backdrop-blur-md rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a6a867] animate-pulse" />
            Grid Calibration
          </div>

          {/* Dynamic Compact Progress Dots */}
          <div className="flex items-center gap-1.5 border border-[#51513d]/10 bg-[#f3edd7]/60 px-4 py-2 shadow-inner backdrop-blur-md rounded-full">
            {Array.from({ length: collectionTotal }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-full transition-all duration-300',
                  idx < activeIndex
                    ? 'h-1.5 w-1.5 bg-[#a6a867]/75'
                    : idx === activeIndex
                      ? 'h-2 w-2 bg-[#a6a867] shadow-[0_0_6px_rgba(166,168,103,0.6)] scale-110'
                      : 'h-1 w-1 bg-[#51513d]/30',
                )}
              />
            ))}
          </div>

          {/* Numeric Step Counter */}
          <div className="border border-[#51513d]/15 bg-[#f3edd7]/90 px-3 py-2 text-[10px] font-mono font-bold tracking-wider text-[#51513d] shadow-[4px_4px_0_rgba(81,81,61,0.05)] backdrop-blur-md rounded-sm">
            STEP <span className="text-[#a6a867]">{collectionStep}</span> / {collectionTotal}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison logic: ignore rapid gaze position streams (gazeX, gazeY)
    // and raw fixationProgress numbers. Only re-render when structural state changes.
    return (
      prevProps.collectionStep === nextProps.collectionStep &&
      prevProps.isStableFixation === nextProps.isStableFixation &&
      prevProps.capturePulse === nextProps.capturePulse &&
      prevProps.currentPoint.x === nextProps.currentPoint.x &&
      prevProps.currentPoint.y === nextProps.currentPoint.y
    );
  }
);
