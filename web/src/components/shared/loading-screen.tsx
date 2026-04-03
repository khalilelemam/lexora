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
      className={cn('flex flex-col items-center justify-center gap-4', className)}
      style={{ minHeight: 400 }}
    >
      <Loader2 className="text-primary h-10 w-10 animate-spin" />
      <p className="text-muted-foreground text-lg font-medium">{message}</p>
    </div>
  );
}
