'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { seededRandom } from '@/lib/seeded-random';

/**
 * Ambient floating particles rendered over the hero section.
 * Uses a seeded PRNG for SSR-safe deterministic positioning.
 */
export function FloatingParticles() {
  const particles = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: 18 }, () => ({
      background: `oklch(${0.5 + rng() * 0.3} ${0.04 + rng() * 0.08} ${90 + rng() * 30})`,
      left: `${rng() * 100}%`,
      top: `${rng() * 100}%`,
      yOffset: -30 - rng() * 40,
      xOffset: rng() * 20 - 10,
      duration: 4 + rng() * 6,
      delay: rng() * 4,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ background: p.background, left: p.left, top: p.top }}
          animate={{
            y: [0, p.yOffset, 0],
            x: [0, p.xOffset, 0],
            opacity: [0.15, 0.5, 0.15],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
