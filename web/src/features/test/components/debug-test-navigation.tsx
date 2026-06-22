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
    <div className="fixed bottom-4 left-4 z-[9999]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="border border-[#51513d] bg-[#f3edd7] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#51513d] shadow-[4px_4px_0_rgba(81,81,61,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgba(81,81,61,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          Debug Menu
        </button>
      ) : (
        <div className="flex w-64 flex-col border border-[#51513d] bg-[#e3dcc2] p-4 shadow-[6px_6px_0_rgba(81,81,61,1)] max-h-[70vh] overflow-y-auto">
          <div className="mb-4 flex items-center justify-between border-b border-[#51513d]/20 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#51513d]">
              Jump to State
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="border border-[#51513d] bg-[#51513d] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#e3dcc2] transition-colors hover:bg-[#1b2021] active:translate-y-px"
            >
              Close
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {states.map((state) => (
              <button
                key={state}
                onClick={() => {
                  onForceState(state);
                  setIsOpen(false);
                }}
                className={`border text-left px-3 py-2 text-[11px] font-bold transition-all ${
                  currentState === state
                    ? 'border-[#51513d] bg-[#a6a867] text-[#1b2021] translate-x-px translate-y-px shadow-none'
                    : 'border-[#51513d]/50 bg-[#f3edd7] text-[#51513d] hover:border-[#51513d] hover:bg-[#e3dcc2] hover:-translate-y-px hover:shadow-[2px_2px_0_rgba(81,81,61,0.5)] active:translate-x-px active:translate-y-px active:shadow-none'
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
