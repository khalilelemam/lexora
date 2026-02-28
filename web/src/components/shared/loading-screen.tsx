import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

/**
 * Child-friendly loading screen with animated spinner and positive messaging.
 */
export function LoadingScreen({
  message = 'Getting things ready...',
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center gap-4',
        className,
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
