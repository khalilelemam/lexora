'use client';

import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DownloadSection() {
  return (
    <section id="download" className="bg-[#f3edd7] px-6 py-20 text-[#1b2021]">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Download className="mx-auto mb-4 h-8 w-8 text-[#51513d]" />
          <h2 className="mb-3 text-3xl font-bold">Download Tobii Service</h2>
          <p className="mx-auto mb-8 max-w-lg text-[#1b2021]/64">
            To use Lexora with a Tobii eye tracker, you&apos;ll need the desktop service. The
            service runs locally and streams gaze data to the web app securely.
          </p>
          <a href="/download">
            <Button size="lg" className="bg-[#51513d] text-lg text-[#e3dcc2] hover:bg-[#1b2021]">
              Go to Download Page
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
