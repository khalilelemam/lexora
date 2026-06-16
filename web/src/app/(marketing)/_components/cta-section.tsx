'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Monitor, Camera, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

/**
 * Bottom call-to-action section with dual mode buttons — Lexora brand palette.
 */
export function CtaSection() {
  const router = useRouter();

  return (
    <section id="get-started" className="relative overflow-hidden px-6 py-20">
      {/* Subtle brand gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, oklch(0.70 0.10 115 / 0.06) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <LexoraLogo size="lg" animate />

        <h2 className="text-3xl font-bold">Ready to Get Started?</h2>

        <p className="text-muted-foreground max-w-md">
          Choose your tracking method and begin the screening process. Results are available
          immediately after completing the reading tasks.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="group gap-2 bg-[oklch(0.40_0.04_110)] px-8 text-[oklch(0.94_0.02_90)] shadow-md transition-all hover:bg-[oklch(0.35_0.04_110)] hover:shadow-lg"
            onClick={() => router.push('/test/tobii')}
          >
            <Monitor className="h-5 w-5" />
            Tobii Eye Tracker
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="group gap-2 border-[oklch(0.70_0.10_115/0.5)] px-8 text-[oklch(0.40_0.04_110)] transition-all hover:border-[oklch(0.70_0.10_115)] hover:bg-[oklch(0.70_0.10_115/0.1)]"
            onClick={() => router.push('/test/webcam')}
          >
            <Camera className="h-5 w-5" />
            Webcam (No Hardware)
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
