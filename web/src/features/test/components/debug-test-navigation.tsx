'use client';

import { useState } from 'react';
import type { TestState } from '../types';

export interface DebugTestShortcut {
  key: string;
  label: string;
  group?: string;
  active?: boolean;
  onSelect: () => void;
}

interface DebugTestNavigationProps {
  states: TestState[];
  currentState: TestState;
  onForceState: (state: TestState) => void;
  shortcuts?: DebugTestShortcut[];
}

export function DebugTestNavigation({
  states,
  currentState,
  onForceState,
  shortcuts = [],
}: DebugTestNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groupedShortcuts = shortcuts.reduce<Record<string, DebugTestShortcut[]>>(
    (groups, shortcut) => {
      const group = shortcut.group ?? 'Shortcuts';
      groups[group] = [...(groups[group] ?? []), shortcut];
      return groups;
    },
    {},
  );

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-9999">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="border border-[#51513d] bg-[#f3edd7] px-4 py-2 text-xs font-black tracking-widest text-[#51513d] uppercase shadow-[4px_4px_0_rgba(81,81,61,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_rgba(81,81,61,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          Debug Menu
        </button>
      ) : (
        <div className="flex max-h-[76vh] w-72 flex-col overflow-y-auto border border-[#51513d] bg-[#e3dcc2] p-4 shadow-[6px_6px_0_rgba(81,81,61,1)]">
          <div className="mb-4 flex items-center justify-between border-b border-[#51513d]/20 pb-3">
            <span className="text-xs font-black tracking-widest text-[#51513d] uppercase">
              Jump to State
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="border border-[#51513d] bg-[#51513d] px-3 py-1.5 text-[9px] font-black tracking-widest text-[#e3dcc2] uppercase transition-colors hover:bg-[#1b2021] active:translate-y-px"
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
                className={`border px-3 py-2 text-left text-[11px] font-bold transition-all ${
                  currentState === state
                    ? 'translate-x-px translate-y-px border-[#51513d] bg-[#a6a867] text-[#1b2021] shadow-none'
                    : 'border-[#51513d]/50 bg-[#f3edd7] text-[#51513d] hover:-translate-y-px hover:border-[#51513d] hover:bg-[#e3dcc2] hover:shadow-[2px_2px_0_rgba(81,81,61,0.5)] active:translate-x-px active:translate-y-px active:shadow-none'
                }`}
              >
                {state}
              </button>
            ))}
          </div>

          {shortcuts.length > 0 && (
            <div className="mt-4 border-t border-[#51513d]/20 pt-4">
              {Object.entries(groupedShortcuts).map(([group, items]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="mb-2 text-[9px] font-black tracking-widest text-[#51513d]/70 uppercase">
                    {group}
                  </p>
                  <div className="flex flex-col gap-2">
                    {items.map((shortcut) => (
                      <button
                        key={shortcut.key}
                        onClick={() => {
                          shortcut.onSelect();
                          setIsOpen(false);
                        }}
                        className={`border px-3 py-2 text-left text-[11px] font-bold transition-all ${
                          shortcut.active
                            ? 'translate-x-px translate-y-px border-[#51513d] bg-[#a6a867] text-[#1b2021] shadow-none'
                            : 'border-[#51513d]/50 bg-[#f3edd7] text-[#51513d] hover:-translate-y-px hover:border-[#51513d] hover:bg-[#e3dcc2] hover:shadow-[2px_2px_0_rgba(81,81,61,0.5)] active:translate-x-px active:translate-y-px active:shadow-none'
                        }`}
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
