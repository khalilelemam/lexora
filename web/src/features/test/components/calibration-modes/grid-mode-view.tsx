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
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(81,81,61,.05) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* 2. Interactive Coordinate-Tracking Glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-700 ease-out"
          style={{
            background: `radial-gradient(circle at ${currentPoint.x * 100}% ${currentPoint.y * 100}%, rgba(166,168,103,0.22), transparent 22rem)`,
          }}
        />

        {/* Decorative Minimal Corner Borders */}
        <div className="pointer-events-none absolute top-6 left-6 hidden h-8 w-8 border border-[#51513d]/10 md:block" />
        <div className="pointer-events-none absolute right-6 bottom-24 hidden h-8 w-8 border border-[#51513d]/10 md:block" />

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

        {/* 5. Active Target (Static Container -> Inner Dot Shrinks) */}
        <div
          key={`grid-target-${collectionStep}`}
          style={{
            left: `${currentPoint.x * 100}%`,
            top: `${currentPoint.y * 100}%`,
          }}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative flex h-24 w-24 items-center justify-center">
            {/* Breathing Glow Aura */}
            <motion.div
              className={cn(
                'absolute inset-4 rounded-full',
                isStableFixation
                  ? 'bg-[#a6a867]/15 shadow-[0_0_24px_rgba(166,168,103,0.24)]'
                  : 'bg-[#a6a867]/6 shadow-[0_0_16px_rgba(166,168,103,0.16)]',
              )}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Static focus target */}
            <div className="absolute h-16 w-16 rounded-full border-2 border-[#1b2021]/80" />
            <div className="absolute h-px w-24 bg-[#1b2021]/75" />
            <div className="absolute h-24 w-px bg-[#1b2021]/75" />
            <div className="absolute h-8 w-8 rounded-full border border-[#1b2021]/30" />

            {/* Calibration target dot: starts large, then shrinks to complete capture. */}
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0 }}
              transition={{
                duration: animationDuration,
                ease: 'linear',
              }}
              onAnimationComplete={() => {
                onSampleCollected?.();
              }}
              className={cn(
                'absolute h-12 w-12 rounded-full border-2 border-[#e3dcc2] transition-colors duration-200',
                isStableFixation
                  ? 'bg-[#a6a867] shadow-[0_0_12px_rgba(166,168,103,0.65)]'
                  : 'bg-[#1b2021] shadow-sm',
              )}
            />

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
        </div>

        {/* 6. Floating HUD Bar (bottom) */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-24 items-end justify-between px-6 pb-6">
          {/* Active Mode Label */}
          <div className="flex items-center gap-2 border-2 border-[#1b2021] bg-[#e3dcc2] px-4 py-2 text-[10px] font-black tracking-widest text-[#1b2021] uppercase shadow-[4px_4px_0_0_#1b2021] sm:text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full border border-[#1b2021] bg-[#a6a867]" />
            Grid Calibration
          </div>

          {/* Dynamic Compact Progress Dots */}
          <div className="hidden items-center gap-2 border-2 border-[#1b2021] bg-[#e3dcc2] px-5 py-2.5 shadow-[4px_4px_0_0_#1b2021] sm:flex">
            {Array.from({ length: collectionTotal }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-full border transition-all duration-300',
                  idx < activeIndex
                    ? 'h-2 w-2 border-[#1b2021] bg-[#a6a867]'
                    : idx === activeIndex
                      ? 'h-2.5 w-2.5 scale-125 border-[#1b2021] bg-[#a6a867] shadow-[1px_1px_0_0_#1b2021]'
                      : 'h-1.5 w-1.5 border-[#1b2021]/30 bg-transparent',
                )}
              />
            ))}
          </div>

          {/* Numeric Step Counter */}
          <div className="border-2 border-[#1b2021] bg-[#e3dcc2] px-4 py-2 font-mono text-[10px] font-black tracking-wider text-[#1b2021] shadow-[4px_4px_0_0_#1b2021] sm:text-xs">
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
  },
);
