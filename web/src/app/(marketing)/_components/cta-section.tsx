'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Monitor, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

/**
 * Bottom call-to-action section with dual mode buttons.
 */
export function CtaSection() {
  const router = useRouter();

  return (
    <section id="get-started" className="px-6 py-20">
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
            className="gap-2 px-8 shadow-md"
            onClick={() => router.push('/test/tobii')}
          >
            <Monitor className="h-5 w-5" />
            Tobii Eye Tracker
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-8"
            onClick={() => router.push('/test/webcam')}
          >
            <Camera className="h-5 w-5" />
            Webcam (No Hardware)
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
