'use client';

import { X } from 'lucide-react';

interface FullscreenShellProps {
  children: React.ReactNode;
  onExit?: () => void;
  showExit?: boolean;
}

/**
 * Full-screen shell for test pages — no header, no footer, no distractions.
 * Uses the Lexora codex brand palette for a cohesive experience.
 * Optional exit button for the guardian to abort the test.
 */
export function FullscreenShell({ children, onExit, showExit = true }: FullscreenShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#e3dcc2] text-[#1b2021]">
      {showExit && onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute top-4 right-4 z-50 flex h-8 w-8 items-center justify-center text-[#51513d]/60 transition-colors hover:text-[#1b2021]"
          aria-label="Exit test"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
        {children}
      </div>
    </div>
  );
}
