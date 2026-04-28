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
      {/* Outer eye shape - Abstract minimalist */}
      <motion.path
        d="M20 60 Q100 10 180 60 Q100 110 20 60 Z"
        stroke="#a6a867"
        strokeWidth="6"
        fill="transparent"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.2, delay: 0.2, ease: 'easeInOut' }}
      />
      {/* Stylized cut / curve matching the new logo feel */}
      <motion.path
        d="M100 60 C 130 60, 150 40, 180 30"
        stroke="#51513d"
        strokeWidth="6"
        fill="transparent"
        strokeLinecap="round"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.2, delay: 0.6, ease: 'easeInOut' }}
      />
      {/* Iris / Pupil abstract */}
      <circle cx="100" cy="60" r="22" fill="#a6a867" />
      <circle cx="100" cy="60" r="12" fill="#1b2021" />
      {/* Pupil — follows mouse, very subtle now */}
      <motion.circle
        cx={100 + pupilPos.x * 0.5}
        cy={60 + pupilPos.y * 0.5}
        r="4"
        fill="#e3dc95"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </motion.svg>
  );
}
