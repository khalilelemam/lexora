'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { seededRandom } from '@/lib/seeded-random';

/**
 * Interactive gaze trail visualization showing fixation patterns
 * over simulated reading text. Demonstrates the concept of gaze
 * analytics to visitors.
 */
export function GazeTrailDemo() {
  const { points, dotSizes } = useMemo(() => {
    const pts = [
      { x: 10, y: 30 }, { x: 25, y: 30 }, { x: 42, y: 30 },
      { x: 58, y: 30 }, { x: 75, y: 30 }, { x: 90, y: 30 },
      { x: 10, y: 55 }, { x: 28, y: 55 }, { x: 45, y: 55 },
      { x: 60, y: 55 }, { x: 78, y: 55 }, { x: 92, y: 55 },
      { x: 12, y: 80 }, { x: 30, y: 80 }, { x: 50, y: 80 },
      { x: 70, y: 80 },
    ];
    const rng = seededRandom(7);
    const sizes = pts.map(() => 8 + rng() * 10);
    return { points: pts, dotSizes: sizes };
  }, []);

  return (
    <div className="relative w-full h-32 rounded-lg bg-card/50 border overflow-hidden">
      <div className="absolute inset-0 opacity-20 text-[10px] font-mono text-muted-foreground p-3 leading-relaxed select-none">
        The quick brown fox jumps over the lazy dog near the old stone bridge while
        birds fly overhead in the warm autumn sky shining bright golden light upon meadows
      </div>
      <svg className="absolute inset-0 w-full h-full">
        {points.slice(1).map((p, i) => (
          <motion.line
            key={i}
            x1={`${points[i].x}%`} y1={`${points[i].y}%`}
            x2={`${p.x}%`} y2={`${p.y}%`}
            stroke="#a6a867"
            strokeWidth="1"
            strokeDasharray="3 3"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.12 }}
            viewport={{ once: true }}
          />
        ))}
      </svg>
      {points.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: dotSizes[i],
            height: dotSizes[i],
            background: i === 5 || i === 12 ? '#9e5a5a' : '#a6a867',
            opacity: i === 5 || i === 12 ? 0.6 : 0.5,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.5 + i * 0.12 }}
          viewport={{ once: true }}
        />
      ))}
    </div>
  );
}
