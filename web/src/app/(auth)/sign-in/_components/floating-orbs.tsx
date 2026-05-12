'use client';

import { motion } from 'framer-motion';

/**
 * Decorative animated geometric shapes for auth pages.
 * Matches the Lexora brutalist/editorial brand with floating
 * rectangles and squares instead of soft orbs.
 */
export function FloatingOrbs() {
  const shapes = [
    { w: 48, h: 48, color: '#a6a867', left: '8%', top: '12%', delay: 0 },
    { w: 72, h: 24, color: '#e3dc95', left: '78%', top: '18%', delay: 0.8 },
    { w: 36, h: 36, color: '#51513d', left: '85%', top: '72%', delay: 1.6 },
    { w: 56, h: 14, color: '#a6a867', left: '12%', top: '82%', delay: 2.2 },
    { w: 20, h: 20, color: '#1b2021', left: '62%', top: '8%', delay: 0.4 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute opacity-[0.12]"
          style={{
            width: s.w,
            height: s.h,
            backgroundColor: s.color,
            left: s.left,
            top: s.top,
          }}
          animate={{
            y: [0, -14, 0],
            x: [0, 8 * (i % 2 === 0 ? 1 : -1), 0],
            rotate: [0, i % 2 === 0 ? 3 : -3, 0],
          }}
          transition={{
            duration: 5 + i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
