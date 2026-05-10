'use client';

import { motion } from 'framer-motion';

/**
 * Decorative animated gradient orbs for auth pages.
 * Purely cosmetic — provides subtle background motion.
 */
export function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-[0.07] dark:opacity-[0.04]"
          style={{
            width: 80 + i * 60,
            height: 80 + i * 60,
            background: 'radial-gradient(circle, oklch(0.7 0.1 115) 0%, transparent 70%)',
            left: `${15 + i * 18}%`,
            top: `${10 + (i % 3) * 30}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10 * (i % 2 === 0 ? 1 : -1), 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
