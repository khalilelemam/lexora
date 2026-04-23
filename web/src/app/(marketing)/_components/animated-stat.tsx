'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedStatProps {
  value: number;
  label: string;
  suffix?: string;
}

/**
 * Counter that animates from 0 to target value when scrolled into view.
 * Uses IntersectionObserver for efficient scroll detection.
 */
export function AnimatedStat({ value, label, suffix = '' }: AnimatedStatProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const duration = 1500;
          const stepTime = 16;
          const steps = duration / stepTime;
          const increment = value / steps;
          const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, stepTime);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-primary">
        {count}{suffix}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
