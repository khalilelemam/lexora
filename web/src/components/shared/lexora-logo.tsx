'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LexoraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  animate?: boolean;
  showText?: boolean;
  showEnglishSubtitle?: boolean;
}

const sizeMap = {
  sm: { iconH: 22, text: 'text-lg', subtext: 'text-[9px]', gap: 'gap-2.5' },
  md: { iconH: 30, text: 'text-2xl', subtext: 'text-[10px]', gap: 'gap-3' },
  lg: { iconH: 42, text: 'text-3xl', subtext: 'text-xs', gap: 'gap-3.5' },
  xl: { iconH: 56, text: 'text-5xl', subtext: 'text-sm', gap: 'gap-4' },
} as const;

/**
 * Lexora brand logo with Arabic-first identity:
 * Displays the iconic eye mark alongside "ليكسورا" with an English "LEXORA" subtitle.
 */
export function LexoraLogo({
  className,
  size = 'md',
  color,
  animate = false,
  showText = true,
  showEnglishSubtitle = true,
}: LexoraLogoProps) {
  const s = sizeMap[size];
  const iconW = Math.round(s.iconH * 1.89);

  return (
    <div className={cn('flex items-center select-none', s.gap, className)}>
      <Image
        src="/images/lexora-logo.svg"
        alt="ليكسورا Lexora"
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
        <div className="flex flex-col justify-center leading-none">
          <span
            className={cn(
              s.text,
              'font-black tracking-tight text-[#1b2021] dark:text-[#f3edd7]',
              color && color.replace(/^text-/, 'text-'),
            )}
          >
            ليكسورا
          </span>
          {showEnglishSubtitle && (
            <span
              className={cn(
                s.subtext,
                'font-bold tracking-[0.22em] text-[#51513d]/75 uppercase mt-0.5',
              )}
            >
              LEXORA
            </span>
          )}
        </div>
      )}
    </div>
  );
}
