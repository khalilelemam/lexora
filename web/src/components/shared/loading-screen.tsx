'use client';

import { motion } from 'framer-motion';
import { LexoraLogo } from './lexora-logo';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({
  message = 'Getting things ready...',
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden',
        className,
      )}
      style={{ minHeight: 500 }}
    >
      {/* Dynamic Background Glows */}
      <motion.div
        className="absolute h-64 w-64 rounded-full bg-[#a6a867]/20 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-48 w-48 rounded-full bg-[#e3dc95]/20 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 rounded-3xl border border-[#51513d]/10 bg-white/40 p-10 shadow-2xl backdrop-blur-xl"
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#a6a867]/30"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#51513d]/20"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
          />
          <LexoraLogo size="lg" animate showText={false} />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xl font-black text-[#1b2021]">{message}</p>
          <p className="text-sm font-medium text-[#1b2021]/60">
            Please wait while our models process the results.
          </p>

          <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-[#51513d]/10">
            <motion.div
              className="h-full rounded-full bg-[#51513d]"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ width: '40%' }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
