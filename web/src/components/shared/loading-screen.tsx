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
        'relative flex flex-col items-center justify-center overflow-hidden bg-[#e3dcc2]',
        className,
      )}
      style={{ minHeight: 500 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 rounded-none border-4 border-[#1b2021] bg-[#f3edd7] p-10 shadow-[8px_8px_0_0_#1b2021]"
      >
        <div className="relative flex h-24 w-24 items-center justify-center border-4 border-[#1b2021] bg-[#a6a867] shadow-[4px_4px_0_0_#1b2021]">
          <LexoraLogo size="lg" animate showText={false} />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xl font-black uppercase tracking-tight text-[#1b2021]">{message}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-[#51513d]">
            Processing results
          </p>

          <div className="mt-4 h-6 w-48 overflow-hidden border-2 border-[#1b2021] bg-[#e3dcc2]">
            <motion.div
              className="h-full border-r-2 border-[#1b2021] bg-[#1b2021]"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
