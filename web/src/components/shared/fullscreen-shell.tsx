'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullscreenShellProps {
  children: React.ReactNode;
  onExit?: () => void;
  showExit?: boolean;
}

/**
 * Full-screen shell for test pages — no header, no footer, no distractions.
 * Optional exit button for the guardian to abort the test.
 */
export function FullscreenShell({ children, onExit, showExit = true }: FullscreenShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background">
      {showExit && onExit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="absolute right-4 top-4 z-50 text-muted-foreground hover:text-foreground"
          aria-label="Exit test"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
      <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6">
        {children}
      </div>
    </div>
  );
}
