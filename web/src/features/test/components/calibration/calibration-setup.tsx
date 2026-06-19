'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { CalibrationVisual, StarGameVisual } from '../pre-test-slides';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';
import { MODE_OPTIONS } from './calibration-constants';

interface CalibrationSetupProps {
  tracker?: 'webcam' | 'tobii';
  resolvedMode: CalibrationVisualMode;
  onSelectMode: (mode: CalibrationVisualMode) => void;
  onStart: () => void;
  startButtonText?: string;
}

/**
 * Calibration setup — horizontal split layout.
 *
 * Left: Instructions + fullscreen consent + start button
 * Right: Mode selection cards
 */
export function CalibrationSetup({
  tracker = 'webcam',
  resolvedMode,
  onSelectMode,
  onStart,
  startButtonText = 'Enter Fullscreen & Start Calibration',
}: CalibrationSetupProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#e3dcc2]/95 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#51513d]/18 bg-[#f3edd7] shadow-[0_24px_70px_rgba(27,32,33,0.16)]"
          style={{ animation: 'float-up 0.5s ease-out' }}
        >
          {/* ── Top: Hero Visual ── */}
          <div className="relative h-64 w-full border-b border-[#51513d]/18 bg-[#1b2021] md:h-80 lg:h-96">
            <div className="absolute inset-0 overflow-hidden opacity-90">
              {resolvedMode === 'star' ? <StarGameVisual /> : <CalibrationVisual />}
            </div>

            {/* Subtle gradient overlay to blend into the rest of the card */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1b2021]/60 to-transparent" />

            {/* Brand header overlay */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3edd7] shadow-lg">
                <LexoraLogo size="sm" showText={false} />
              </div>
              <div className="rounded-md bg-[#1b2021]/80 px-3 py-1 text-xs font-black tracking-widest text-[#e3dc95] uppercase backdrop-blur-md">
                Setup
              </div>
            </div>
          </div>

          {/* ── Bottom: Content Area (Two Columns on Desktop) ── */}
          <div className="flex flex-col lg:flex-row">
            {/* Left: Instructions & Controls */}
            <div className="flex flex-1 flex-col gap-6 p-7 lg:p-10">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-[#1b2021]">
                  Prepare for Calibration
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[#1b2021]/70">
                  Before starting the reading task, we need to map your eye movements. Follow the
                  target with your eyes while keeping your head completely still.
                </p>
              </div>

              {/* Checklist */}
              <div className="rounded-xl border border-[#51513d]/15 bg-[#51513d]/5 p-5">
                <p className="mb-3 text-sm font-black tracking-wider text-[#51513d] uppercase">
                  Before you start
                </p>
                <ul className="grid gap-2.5 text-sm text-[#1b2021]/80">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#51513d]" />
                    <span>Sit at a comfortable distance (about arm&apos;s length).</span>
                  </li>
                  {tracker === 'webcam' && (
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a6a867]" />
                      <span className="font-semibold text-[#51513d]">
                        Position webcam slightly above eye level. Bottom points will be lost if
                        exactly at eye level.
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#51513d]" />
                    <span>Keep your head still — move only your eyes.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#51513d]" />
                    <span>Ensure your face is well-lit.</span>
                  </li>
                </ul>
              </div>

              {/* Fullscreen consent */}
              <div className="flex items-start gap-3 rounded-xl border border-[#e3dc95]/60 bg-[#e3dc95]/20 p-4 text-sm leading-relaxed text-[#1b2021]/80">
                <Maximize className="mt-0.5 h-5 w-5 shrink-0 text-[#51513d]" />
                <p>
                  Calibration requires <strong className="text-[#1b2021]">fullscreen mode</strong>{' '}
                  for accurate tracking. Press{' '}
                  <kbd className="mx-1 rounded border border-[#51513d]/18 bg-[#e3dcc2] px-1.5 py-0.5 font-mono text-xs font-bold shadow-sm">
                    Esc
                  </kbd>{' '}
                  to exit anytime.
                </p>
              </div>

              {/* Start Button & Trigger */}
              <div className="mt-auto flex flex-col gap-3">
                <Button
                  onClick={onStart}
                  size="lg"
                  className="h-14 w-full bg-[#51513d] text-base font-bold text-[#e3dcc2] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#1b2021] hover:shadow-xl"
                >
                  {startButtonText}
                </Button>
                <p className="text-center text-xs font-medium text-[#1b2021]/60">
                  Or press <kbd className="mx-1 rounded border border-[#51513d]/18 bg-[#e3dcc2] px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-sm">Enter ↵</kbd> to start
                </p>
              </div>
            </div>

            {/* Right: Mode Selection */}
            <div className="flex w-full flex-col border-t border-[#51513d]/18 bg-[#e3dcc2]/30 p-7 lg:w-[420px] lg:shrink-0 lg:border-t-0 lg:border-l lg:p-10">
              <div className="mb-6">
                <h3 className="text-lg font-black tracking-tight text-[#1b2021]">Select Style</h3>
                <p className="mt-1 text-sm text-[#1b2021]/60">
                  Each style collects the same data points.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {MODE_OPTIONS.map((option) => {
                  const isDisabled = option.disabled === true;
                  const isSelected = resolvedMode === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) onSelectMode(option.key);
                      }}
                      className={cn(
                        'group relative flex items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition-all duration-300 ease-out',
                        isSelected
                          ? 'border-[#51513d] bg-[#f3edd7] shadow-[4px_4px_0_rgba(81,81,61,.2)]'
                          : isDisabled
                            ? 'cursor-not-allowed border-transparent bg-[#e3dcc2]/50 opacity-60 grayscale'
                            : 'border-transparent bg-[#f3edd7]/80 hover:-translate-y-0.5 hover:border-[#51513d]/40 hover:bg-[#f3edd7] hover:shadow-md',
                      )}
                    >
                      {/* Mode Image */}
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#e3dcc2] shadow-inner">
                        <Image
                          src={option.image}
                          alt={option.label}
                          fill
                          className={cn(
                            'object-cover transition-transform duration-500',
                            !isDisabled && 'group-hover:scale-110',
                          )}
                          sizes="96px"
                        />
                        {isSelected && !isDisabled && (
                          <div className="absolute inset-0 rounded-xl ring-2 ring-[#51513d]/20 ring-inset" />
                        )}
                      </div>

                      {/* Mode Info */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-[#1b2021]">
                            {option.label}
                          </span>
                          {option.comingSoon && (
                            <span className="rounded-full bg-[#51513d] px-2 py-0.5 text-[9px] font-black tracking-widest text-[#e3dc95] uppercase">
                              Soon
                            </span>
                          )}
                        </div>
                        <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#1b2021]/70">
                          {option.description}
                        </span>
                      </div>

                      {/* Selection Indicator */}
                      <div className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center">
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border-2 transition-all duration-300',
                            isSelected
                              ? 'scale-100 border-[#51513d] bg-[#51513d]'
                              : 'scale-75 border-[#51513d]/20 bg-transparent group-hover:border-[#51513d]/40',
                            isDisabled && 'hidden',
                          )}
                        >
                          {isSelected && (
                            <div className="h-full w-full rounded-full border-2 border-[#f3edd7]" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
