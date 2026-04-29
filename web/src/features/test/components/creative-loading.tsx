'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LexoraLogo } from '@/components/shared/lexora-logo';

const MESSAGES = [
  'Reading your reading…',
  'Mapping eye movements…',
  'Tracing gaze patterns…',
  'Detecting fixations…',
  'Analysing saccades…',
  'Checking for regressions…',
  'Counting return sweeps…',
  'Building feature vectors…',
  'Running the ML model…',
  'Almost there…',
] as const;

/**
 * Creative fullscreen loading overlay shown during ML analysis submission.
 * Replaces the generic spinner with an animated eye-scan visualization,
 * rotating status messages, and a progress-style dot grid.
 */
export function CreativeLoading() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Animate dots appearing one by one
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev < 24 ? prev + 1 : prev));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Generate scan-path dot positions (simulates reading pattern)
  const scanDots = useMemo(() => {
    const dots: Array<{ x: number; y: number; delay: number }> = [];
    const lines = 4;
    const dotsPerLine = 6;
    for (let line = 0; line < lines; line++) {
      for (let d = 0; d < dotsPerLine; d++) {
        dots.push({
          x: 15 + (d / (dotsPerLine - 1)) * 70,
          y: 20 + line * 18,
          delay: (line * dotsPerLine + d) * 0.15,
        });
      }
    }
    return dots;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDF8F0]">
      {/* Scan-path animation */}
      <div className="relative w-64 h-40 mb-8">
        {/* Background text lines (faded) */}
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            className="absolute left-[12%] right-[12%] h-[2px] rounded-full bg-[#E8E0D4]/60"
            style={{ top: `${20 + line * 18}%` }}
          />
        ))}

        {/* Animated fixation dots */}
        {scanDots.slice(0, dotCount).map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#4A7C59]"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <div
              className="rounded-full bg-[#4A7C59]"
              style={{
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
              }}
            />
          </motion.div>
        ))}

        {/* Saccade connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {scanDots.slice(1, dotCount).map((dot, i) => {
            const prev = scanDots[i];
            return (
              <motion.line
                key={i}
                x1={`${prev.x}%`}
                y1={`${prev.y}%`}
                x2={`${dot.x}%`}
                y2={`${dot.y}%`}
                stroke="#4A7C59"
                strokeWidth="1"
                opacity="0.2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2 }}
              />
            );
          })}
        </svg>

        {/* Current "scanner" dot */}
        {dotCount > 0 && dotCount <= scanDots.length && (
          <motion.div
            className="absolute w-3 h-3 rounded-full bg-[#4A7C59] shadow-md shadow-[#4A7C59]/30"
            style={{
              left: `${scanDots[Math.min(dotCount - 1, scanDots.length - 1)].x}%`,
              top: `${scanDots[Math.min(dotCount - 1, scanDots.length - 1)].y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>

      {/* Logo */}
      <LexoraLogo size="sm" className="mb-4" />

      {/* Rotating message */}
      <div className="h-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            className="text-sm font-medium text-[#6B6560]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {MESSAGES[msgIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Subtle progress bar */}
      <div className="mt-6 w-48 h-1 bg-[#E8E0D4] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#4A7C59] rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 12, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
