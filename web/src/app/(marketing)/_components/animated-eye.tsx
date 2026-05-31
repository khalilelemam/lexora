'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Pre-computed radial tick marks (compass lines).
 *
 * Coordinates are rounded to 2 decimal places to guarantee identical
 * values on server and client — avoids React hydration mismatches
 * caused by floating-point trig precision differences.
 */
const TICK_MARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    x1: round(90 + Math.cos(angle) * 70),
    y1: round(90 + Math.sin(angle) * 70),
    x2: round(90 + Math.cos(angle) * 74),
    y2: round(90 + Math.sin(angle) * 74),
  };
});

/**
 * Animated abstract brand mark — concentric iris rings with gentle
 * mouse-tracking parallax. Replaces the realistic eye SVG with
 * a friendly, brand-aligned design.
 */
export function AnimatedEye() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 3;
      const dx = (e.clientX - centerX) / window.innerWidth;
      const dy = (e.clientY - centerY) / window.innerHeight;
      const maxOffset = 8;
      setOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, dx * maxOffset * 2)),
        y: Math.max(-maxOffset, Math.min(maxOffset, dy * maxOffset * 2)),
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
    >
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Outer glow ring */}
        <motion.circle
          cx="90"
          cy="90"
          r="85"
          stroke="oklch(0.70 0.10 115 / 0.15)"
          strokeWidth="1.5"
          fill="none"
          animate={{ r: [85, 87, 85] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Ring 5 — outermost decorative */}
        <motion.circle
          cx="90"
          cy="90"
          r="76"
          stroke="oklch(0.70 0.10 115 / 0.2)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="8 6"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '90px 90px' }}
        />

        {/* Ring 4 — warm khaki accent */}
        <motion.circle
          cx="90"
          cy="90"
          r="65"
          stroke="oklch(0.78 0.10 90 / 0.25)"
          strokeWidth="2"
          fill="none"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '90px 90px' }}
          strokeDasharray="12 8 4 8"
        />

        {/* Ring 3 — sage green primary */}
        <circle
          cx="90"
          cy="90"
          r="52"
          fill="oklch(0.70 0.10 115 / 0.08)"
          stroke="oklch(0.70 0.10 115 / 0.35)"
          strokeWidth="2"
        />

        {/* Ring 2 — dark olive */}
        <circle
          cx="90"
          cy="90"
          r="38"
          fill="oklch(0.40 0.04 110 / 0.12)"
          stroke="oklch(0.40 0.04 110 / 0.4)"
          strokeWidth="2.5"
        />

        {/* Inner iris — sage gradient */}
        <circle cx="90" cy="90" r="26" fill="oklch(0.70 0.10 115 / 0.6)" />
        <circle cx="90" cy="90" r="20" fill="oklch(0.65 0.10 115 / 0.8)" />

        {/* Pupil core — follows mouse */}
        <motion.circle
          cx={90 + offset.x}
          cy={90 + offset.y}
          r="10"
          fill="oklch(0.25 0.03 110)"
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />

        {/* Light reflections — follow mouse subtly */}
        <motion.circle
          cx={96 + offset.x * 0.4}
          cy={84 + offset.y * 0.4}
          r="3.5"
          fill="oklch(0.96 0.02 90 / 0.7)"
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
        <motion.circle
          cx={85 + offset.x * 0.3}
          cy={93 + offset.y * 0.3}
          r="2"
          fill="oklch(0.96 0.02 90 / 0.4)"
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />

        {/* Radial tick marks — like a compass */}
        {TICK_MARKS.map(({ x1, y1, x2, y2 }, i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="oklch(0.70 0.10 115 / 0.3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Ambient glow behind the whole thing */}
      <div
        className="absolute inset-0 -z-10 rounded-full blur-2xl"
        style={{
          background: 'radial-gradient(circle, oklch(0.70 0.10 115 / 0.15) 0%, transparent 70%)',
        }}
      />
    </motion.div>
  );
}
