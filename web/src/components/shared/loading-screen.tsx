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
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#e3dcc2]/90 backdrop-blur-md',
        className,
      )}
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-8 rounded-2xl border border-[#51513d]/18 bg-[#f3edd7] p-12 text-center shadow-2xl">
        <LexoraLogo size="lg" animate showText={false} />
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-black tracking-tight text-[#1b2021]">{message}</p>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-[#51513d]/10">
            <div
              className="h-full w-1/3 rounded-full bg-[#51513d]"
              style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
            />
          </div>
          <p className="mt-2 text-xs font-medium tracking-widest text-[#51513d]/60 uppercase">
            Please wait
          </p>
        </div>
      </div>
    </div>
  );
}
