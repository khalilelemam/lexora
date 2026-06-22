'use client';

import { useState } from 'react';
import type { TestState } from '../types';

interface DebugTestNavigationProps {
  states: TestState[];
  currentState: TestState;
  onForceState: (state: TestState) => void;
}

export function DebugTestNavigation({
  states,
  currentState,
  onForceState,
}: DebugTestNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-sans text-sm">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-black/60 px-3 py-1.5 text-white/90 backdrop-blur-md hover:bg-black/80 shadow-lg"
        >
          Debug: Jump to Page
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-3 shadow-xl max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-black/10 pb-2">
            <span className="font-semibold text-black/80">Jump to State</span>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md bg-black/5 px-2 py-1 text-xs hover:bg-black/10"
            >
              Close
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {states.map((state) => (
              <button
                key={state}
                onClick={() => {
                  onForceState(state);
                  setIsOpen(false);
                }}
                className={`text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                  currentState === state
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'hover:bg-black/5 text-black/70'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
