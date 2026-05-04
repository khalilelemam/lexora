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
    <section
      ref={heroRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <FloatingParticles />

      {/* Gradient decorations */}
      <div
        className="absolute top-20 left-10 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'oklch(0.70 0.10 115 / 0.08)' }}
        aria-hidden="true"
      />
      <div
        className="absolute right-10 bottom-20 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'oklch(0.78 0.10 90 / 0.06)' }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: 'oklch(0.40 0.04 110 / 0.04)' }}
        aria-hidden="true"
      />

      <motion.div
        className="relative z-10 flex max-w-3xl flex-col items-center gap-8 px-6 text-center"
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
          className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span className="bg-linear-to-r from-[oklch(0.35_0.04_110)] via-[oklch(0.50_0.06_110)] to-[oklch(0.65_0.10_115)] bg-clip-text text-transparent">
            See Reading Differently
          </span>
        </motion.h1>

        <motion.p
          className="text-muted-foreground max-w-xl text-lg leading-relaxed sm:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Lexora uses eye-tracking technology to provide non-invasive dyslexia screening.
          Research-backed gaze analysis helps identify reading difficulties early — so every child
          gets the support they need.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Button
            size="lg"
            className="group gap-2 bg-[oklch(0.40_0.04_110)] px-8 text-[oklch(0.94_0.02_90)] shadow-md transition-all hover:bg-[oklch(0.35_0.04_110)] hover:shadow-lg"
            onClick={() => router.push('/test/tobii')}
          >
            <Monitor className="h-4 w-4" />
            Start with Tobii
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="group gap-2 border-[oklch(0.70_0.10_115/0.5)] px-8 text-[oklch(0.40_0.04_110)] transition-all hover:border-[oklch(0.70_0.10_115)] hover:bg-[oklch(0.70_0.10_115/0.1)]"
            onClick={() => router.push('/test/webcam')}
          >
            <Camera className="h-4 w-4" />
            Use Webcam
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>

        <motion.p
          className="text-muted-foreground/60 text-xs"
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
        <ChevronDown className="text-muted-foreground/40 h-5 w-5" />
      </motion.div>
    </section>
  );
}
