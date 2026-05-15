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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#e3dcc2] text-[#1b2021]">
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(81,81,61,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(81,81,61,0.24)_1px,transparent_1px)] [background-size:42px_42px] opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f3edd7] to-transparent" />
      {showExit && onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute top-4 right-4 z-50 flex h-9 w-9 items-center justify-center border border-[#51513d]/18 bg-[#f3edd7]/80 text-[#51513d]/70 backdrop-blur transition-colors hover:text-[#1b2021]"
          aria-label="Exit test"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      <div className="relative z-10 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
        {children}
      </div>
    </div>
  );
}
