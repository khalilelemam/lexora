'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { seededRandom } from '@/lib/seeded-random';

/**
 * Interactive gaze trail visualization showing a realistic reading scan-path.
 * Demonstrates forward fixations, return sweeps, and regressions
 * over simulated reading text with brand-aligned colors.
 */
export function GazeTrailDemo() {
  const { points, dotSizes, isRegression, isReturnSweep } = useMemo(() => {
    // Realistic reading scan-path: L→R across 4 lines with return sweeps and regressions
    const pts = [
      // Line 1: left to right
      { x: 8, y: 18 },
      { x: 20, y: 18 },
      { x: 34, y: 19 },
      { x: 48, y: 18 },
      { x: 60, y: 17 },
      { x: 74, y: 18 },
      { x: 88, y: 18 },
      // Regression on line 1
      { x: 60, y: 18 },
      // Return sweep to line 2
      { x: 8, y: 42 },
      // Line 2
      { x: 22, y: 42 },
      { x: 38, y: 43 },
      { x: 52, y: 42 },
      { x: 66, y: 42 },
      { x: 80, y: 43 },
      { x: 92, y: 42 },
      // Return sweep to line 3
      { x: 8, y: 66 },
      // Line 3
      { x: 22, y: 66 },
      { x: 36, y: 67 },
      // Regression on line 3
      { x: 22, y: 66 },
      // Continue line 3
      { x: 50, y: 66 },
      { x: 64, y: 67 },
      { x: 78, y: 66 },
      // Return sweep to line 4
      { x: 8, y: 88 },
      // Line 4
      { x: 24, y: 88 },
      { x: 42, y: 89 },
      { x: 58, y: 88 },
    ];

    // Mark which points are regressions and return sweeps
    const regFlags = pts.map((p, i) => {
      if (i === 0) return false;
      // Regression: moving left on the same line
      const sameLine = Math.abs(p.y - pts[i - 1].y) < 10;
      return sameLine && p.x < pts[i - 1].x;
    });

    const sweepFlags = pts.map((p, i) => {
      if (i === 0) return false;
      // Return sweep: large downward + leftward movement
      return p.y - pts[i - 1].y > 10 && p.x < pts[i - 1].x;
    });

    const rng = seededRandom(42);
    const sizes = pts.map((_, i) => {
      if (regFlags[i]) return 12 + rng() * 6; // Regressions are slightly larger (longer fixation)
      return 7 + rng() * 8;
    });

    return { points: pts, dotSizes: sizes, isRegression: regFlags, isReturnSweep: sweepFlags };
  }, []);

  return (
    <div className="relative w-full rounded-xl bg-card/60 border border-border/60 overflow-hidden" style={{ height: '160px' }}>
      {/* Background text — faded reading content */}
      <div className="absolute inset-0 opacity-[0.15] text-[11px] font-serif text-foreground p-4 leading-[2.4] select-none tracking-wide">
        The morning sun cast golden streaks across the classroom walls as young readers opened their books with quiet excitement, each child finding their own rhythm in the carefully arranged words before them, some moving swiftly while others lingered on each syllable with curious attention
      </div>

      {/* Saccade lines */}
      <svg className="absolute inset-0 w-full h-full">
        {points.slice(1).map((p, i) => {
          const prev = points[i];
          const isSweep = isReturnSweep[i + 1];
          const isReg = isRegression[i + 1];

          return (
            <motion.line
              key={i}
              x1={`${prev.x}%`}
              y1={`${prev.y}%`}
              x2={`${p.x}%`}
              y2={`${p.y}%`}
              stroke={
                isSweep
                  ? 'oklch(0.65 0.02 90 / 0.3)'
                  : isReg
                    ? 'oklch(0.52 0.12 25 / 0.4)'
                    : 'oklch(0.70 0.10 115 / 0.35)'
              }
              strokeWidth={isSweep ? '1' : '1.5'}
              strokeDasharray={isSweep ? '4 4' : 'none'}
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.6 + i * 0.08 }}
              viewport={{ once: true }}
            />
          );
        })}
      </svg>

      {/* Fixation dots */}
      {points.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: dotSizes[i],
            height: dotSizes[i],
            background: isRegression[i]
              ? 'oklch(0.52 0.12 25 / 0.55)'
              : 'oklch(0.70 0.10 115 / 0.5)',
            transform: 'translate(-50%, -50%)',
            boxShadow: isRegression[i]
              ? '0 0 6px oklch(0.52 0.12 25 / 0.2)'
              : '0 0 6px oklch(0.70 0.10 115 / 0.15)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.4 + i * 0.08 }}
          viewport={{ once: true }}
        />
      ))}

      {/* Animated scan line — shows reading progression */}
      <motion.div
        className="absolute left-0 h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, oklch(0.70 0.10 115 / 0.4), transparent)',
          width: '15%',
          top: '18%',
        }}
        initial={{ left: '0%', opacity: 0 }}
        whileInView={{
          left: ['0%', '85%', '0%', '85%', '0%', '60%'],
          top: ['18%', '18%', '42%', '42%', '66%', '66%'],
          opacity: [0, 0.6, 0.6, 0.6, 0.6, 0],
        }}
        transition={{ duration: 4, delay: 1.5, ease: 'easeInOut' }}
        viewport={{ once: true }}
      />
    </div>
  );
}
