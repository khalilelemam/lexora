import { cn } from '@/lib/utils';
import { LexoraLogo } from './lexora-logo';

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
      className={cn('flex flex-col items-center justify-center gap-6', className)}
      style={{ minHeight: 400 }}
    >
      <LexoraLogo size="lg" animate showText={false} />
      <div className="flex flex-col items-center gap-2">
        <p className="text-foreground text-lg font-medium">{message}</p>
        <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-1/3 rounded-full bg-linear-to-r from-primary to-accent"
            style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  );
}
