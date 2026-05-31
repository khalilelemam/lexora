'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
      className="flex flex-col items-center gap-4 p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <CheckCircle2 className="h-14 w-14 text-[oklch(0.7_0.1_115)]" />
      </motion.div>

      <h2 className="text-xl font-semibold">Check your email</h2>

      <p className="text-muted-foreground text-sm leading-relaxed">
        We&apos;ve sent a sign-in link to{' '}
        <span className="text-foreground font-medium">{email}</span>.
        <br />
        Click the link to sign in. It expires in 15 minutes.
      </p>

      <Button variant="ghost" size="sm" onClick={onBack} className="mt-2">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to sign in
      </Button>
    </motion.div>
  );
}
