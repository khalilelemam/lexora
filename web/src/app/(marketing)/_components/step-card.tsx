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
      className="relative flex flex-col items-center text-center gap-4 p-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="relative">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 text-accent-foreground shadow-sm">
          {icon}
        </div>
        <span className="absolute -top-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          {step}
        </span>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
    </motion.div>
  );
}
