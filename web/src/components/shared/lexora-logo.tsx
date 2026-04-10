'use client';

import { cn } from '@/lib/utils';

interface LexoraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 28, text: 'text-lg', gap: 'gap-2' },
  md: { icon: 40, text: 'text-2xl', gap: 'gap-2.5' },
  lg: { icon: 56, text: 'text-4xl', gap: 'gap-3' },
  xl: { icon: 72, text: 'text-5xl', gap: 'gap-4' },
} as const;

/**
 * Lexora brand logo — stylized eye icon derived from the official brand assets.
 * Uses the brand olive/sage palette via CSS custom properties.
 */
export function LexoraLogo({
  className,
  size = 'md',
  animate = false,
  showText = true,
}: LexoraLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(animate && 'animate-[lexora-pulse_2.4s_ease-in-out_infinite]')}
        aria-hidden="true"
      >
        {/* Outer eye shape — almond with olive stroke */}
        <path
          d="M4 32C4 32 16 12 32 12C48 12 60 32 60 32C60 32 48 52 32 52C16 52 4 32 4 32Z"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner lens curve — top */}
        <path
          d="M12 32C12 32 20 20 32 20C44 20 52 32 52 32"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        {/* Inner lens curve — bottom */}
        <path
          d="M12 32C12 32 20 44 32 44C44 44 52 32 52 32"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        {/* Iris */}
        <circle cx="32" cy="32" r="9" fill="hsl(var(--primary))" opacity="0.85" />
        {/* Pupil */}
        <circle cx="32" cy="32" r="4" fill="hsl(var(--primary-foreground))" />
        {/* Crescent reflection — brand signature */}
        <path
          d="M28 28C30 26 34 26 36 28C34 27 30 27 28 28Z"
          fill="hsl(var(--primary-foreground))"
          opacity="0.5"
        />
        {/* Light dot */}
        <circle cx="36" cy="28" r="1.5" fill="hsl(var(--primary-foreground))" opacity="0.6" />
      </svg>
      {showText && (
        <span
          className={cn(
            s.text,
            'font-bold tracking-tight bg-linear-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent',
          )}
        >
          Lexora
        </span>
      )}
    </div>
  );
}
