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
          Choose your tracking method and begin the screening process. Results are available
          immediately after completing the reading tasks.
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
        </div>

        <div className="mt-12 pt-12 border-t w-full border-border">
          <h3 className="text-xl font-medium mb-6">Download the Tobii Service App</h3>
          <p className="text-sm text-muted-foreground mb-6">Required for the Tobii Eye Tracker mode.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('https://github.com/khalilelemam/eglex/releases/latest', '_blank')}
            >
              Windows Download
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('https://github.com/khalilelemam/eglex/releases/latest', '_blank')}
            >
              macOS Download
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('https://github.com/khalilelemam/eglex/releases/latest', '_blank')}
            >
              Linux Download
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
