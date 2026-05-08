'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: ReactNode;
  delay: number;
}

export function StepCard({ step, title, description, icon, delay }: StepCardProps) {
  return (
    <motion.div
      className="relative flex flex-col items-center gap-4 p-6 text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="relative">
        <div className="bg-accent/15 text-accent-foreground flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm">
          {icon}
        </div>
        <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
          {step}
        </span>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
