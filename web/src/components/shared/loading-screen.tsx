import { LexoraLogo } from './lexora-logo';
import { cn } from '@/lib/utils';

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
        <p className="text-lg font-black text-[#1b2021]">{message}</p>
        <div className="mt-2 h-1 w-48 overflow-hidden bg-[#51513d]/12">
          <div
            className="h-full w-1/3 bg-[#51513d]"
            style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  );
}
