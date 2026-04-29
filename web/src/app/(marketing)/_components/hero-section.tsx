'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Monitor, Camera, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AnimatedEye } from './animated-eye';
import { FloatingParticles } from './floating-particles';

/**
 * Full-viewport hero section with parallax scrolling, abstract brand iris,
 * floating particles, and dual CTA buttons — all in Lexora brand palette.
 */
export function HeroSection() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], ['0%', '15%']);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <FloatingParticles />

      {/* Gradient decorations */}
      <div
        className="absolute top-20 left-10 w-80 h-80 rounded-full blur-3xl"
        style={{ background: 'oklch(0.70 0.10 115 / 0.08)' }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'oklch(0.78 0.10 90 / 0.06)' }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full blur-3xl"
        style={{ background: 'oklch(0.40 0.04 110 / 0.04)' }}
        aria-hidden="true"
      />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center gap-8 px-6 max-w-3xl"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <AnimatedEye />
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span className="bg-linear-to-r from-[oklch(0.35_0.04_110)] via-[oklch(0.50_0.06_110)] to-[oklch(0.65_0.10_115)] bg-clip-text text-transparent">
            See Reading Differently
          </span>
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Lexora uses eye-tracking technology to provide non-invasive dyslexia screening.
          Research-backed gaze analysis helps identify reading difficulties early — so every
          child gets the support they need.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Button
            size="lg"
            className="group gap-2 px-8 bg-[oklch(0.40_0.04_110)] hover:bg-[oklch(0.35_0.04_110)] text-[oklch(0.94_0.02_90)] shadow-md transition-all hover:shadow-lg"
            onClick={() => router.push('/test/tobii')}
          >
            <Monitor className="w-4 h-4" />
            Start with Tobii
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="group gap-2 px-8 border-[oklch(0.70_0.10_115/0.5)] text-[oklch(0.40_0.04_110)] hover:bg-[oklch(0.70_0.10_115/0.1)] hover:border-[oklch(0.70_0.10_115)] transition-all"
            onClick={() => router.push('/test/webcam')}
          >
            <Camera className="w-4 h-4" />
            Use Webcam
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>

        <motion.p
          className="text-xs text-muted-foreground/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          No personal data stored · Research use only · Works offline
        </motion.p>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <ChevronDown className="w-5 h-5 text-muted-foreground/40" />
      </motion.div>
    </section>
  );
}
