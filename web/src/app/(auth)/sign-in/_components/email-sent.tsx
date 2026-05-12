'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface EmailSentProps {
  email: string;
  onBack: () => void;
}

/**
 * Confirmation view after a magic-link email has been sent.
 * Shows the target email and a back button.
 */
export function EmailSent({ email, onBack }: EmailSentProps) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center gap-5 p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex h-20 w-20 items-center justify-center bg-[#a6a867]/15"
      >
        <CheckCircle2 className="h-10 w-10 text-[#a6a867]" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#1b2021]">Check your email</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#1b2021]/60">
          We&apos;ve sent a sign-in link to{' '}
          <span className="font-black text-[#51513d]">{email}</span>.
          <br />
          Click the link to sign in. It expires in 15 minutes.
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-1 inline-flex items-center border border-[#51513d]/25 bg-[#e3dcc2]/60 px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to sign in
      </button>
    </motion.div>
  );
}
