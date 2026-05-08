'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LexoraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  animate?: boolean;
  showText?: boolean;
}

const sizeMap = {
  sm: { iconH: 20, text: 'text-lg', gap: 'gap-2' },
  md: { iconH: 28, text: 'text-2xl', gap: 'gap-2.5' },
  lg: { iconH: 40, text: 'text-4xl', gap: 'gap-3' },
  xl: { iconH: 52, text: 'text-5xl', gap: 'gap-4' },
} as const;

/**
 * Lexora brand logo — uses the official SVG icon from brand assets.
 * The SVG is all-black; apply color via CSS filter or the `color` prop class.
 *
 * For dark backgrounds: color="text-white" + invert filter
 * For light backgrounds: color="text-[#2D2A26]" (default)
 */
export function LexoraLogo({
  className,
  size = 'md',
  color,
  animate = false,
  showText = true,
}: LexoraLogoProps) {
  const s = sizeMap[size];
  // Aspect ratio of the official icon SVG: 142.51 × 75.47 ≈ 1.888 : 1
  const iconW = Math.round(s.iconH * 1.89);

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <Image
        src="/images/lexora-logo.svg"
        alt="Lexora"
        width={iconW}
        height={s.iconH}
        className={cn(
          'transition-all dark:brightness-0 dark:invert',
          animate && 'animate-[lexora-pulse_2.4s_ease-in-out_infinite]',
          color,
        )}
        priority
      />
      {showText && (
        <span
          className={cn(
            s.text,
            'font-bold tracking-tight',
            color
              ? color.replace(/^text-/, 'text-')
              : 'from-primary to-accent bg-linear-to-r bg-clip-text text-transparent',
          )}
        >
          Lexora
        </span>
      )}
    </div>
  );
}
