'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated eye SVG with pupil that follows the mouse cursor.
 * Provides an engaging, interactive hero element.
 */
export function AnimatedEye() {
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 3;
      const dx = (e.clientX - centerX) / window.innerWidth;
      const dy = (e.clientY - centerY) / window.innerHeight;
      const maxOffset = 6;
      setPupilPos({
        x: Math.max(-maxOffset, Math.min(maxOffset, dx * maxOffset * 2)),
        y: Math.max(-maxOffset, Math.min(maxOffset, dy * maxOffset * 2)),
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.svg
      width="200"
      height="120"
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
      className="drop-shadow-xl"
    >
      {/* Outer eye shape */}
      <motion.path
        d="M10 60C10 60 40 15 100 15C160 15 190 60 190 60C190 60 160 105 100 105C40 105 10 60 10 60Z"
        stroke="oklch(0.40 0.04 110)"
        strokeWidth="3.5"
        fill="oklch(0.94 0.02 90 / 0.3)"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
      />
      {/* Iris ring */}
      <circle cx="100" cy="60" r="25" fill="oklch(0.40 0.04 110 / 0.8)" />
      <circle cx="100" cy="60" r="18" fill="oklch(0.70 0.10 115 / 0.9)" />
      {/* Pupil — follows mouse */}
      <motion.circle
        cx={100 + pupilPos.x}
        cy={60 + pupilPos.y}
        r="9"
        fill="oklch(0.18 0.01 90)"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      {/* Light reflections */}
      <circle
        cx={106 + pupilPos.x * 0.4}
        cy={54 + pupilPos.y * 0.4}
        r="3"
        fill="oklch(0.94 0.02 90 / 0.7)"
      />
      <circle
        cx={96 + pupilPos.x * 0.3}
        cy={62 + pupilPos.y * 0.3}
        r="1.5"
        fill="oklch(0.94 0.02 90 / 0.4)"
      />
    </motion.svg>
  );
}
