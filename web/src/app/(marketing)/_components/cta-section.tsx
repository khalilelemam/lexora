'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Monitor, Camera, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

/**
 * Bottom call-to-action section with test mode buttons.
 */
export function CtaSection() {
  const router = useRouter();

  return (
    <section id="get-started" className="py-20 px-6">
      <motion.div
        className="max-w-2xl mx-auto text-center flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <LexoraLogo size="lg" animate />
        <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
        <p className="text-muted-foreground max-w-md">
          Choose your screening method. All results are available immediately
          after completing the tasks.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button
            size="lg"
            className="gap-2 px-8 shadow-md"
            onClick={() => router.push('/test/tobii')}
          >
            <Monitor className="w-5 h-5" />
            Tobii Eye Tracker
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-8"
            onClick={() => router.push('/test/webcam')}
          >
            <Camera className="w-5 h-5" />
            Webcam (No Hardware)
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-8 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => router.push('/gamified-test')}
          >
            <Gamepad2 className="w-5 h-5" />
            Gamified Test
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
