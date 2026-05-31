'use client';

import Image from 'next/image';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';
import { MODE_OPTIONS } from './calibration-constants';

interface CalibrationSetupProps {
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
  resolvedMode,
  onSelectMode,
  onStart,
  startButtonText = 'Enter Fullscreen & Start Calibration',
}: CalibrationSetupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[#FDF8F0] px-4 py-6">
      <div
        className="flex w-[min(960px,95vw)] flex-col gap-6 overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white/80 shadow-lg backdrop-blur-sm lg:flex-row lg:gap-0"
        style={{ animation: 'float-up 0.5s ease-out' }}
      >
        {/* ── Left: Instructions ── */}
        <div className="flex shrink-0 flex-col gap-5 p-7 lg:w-105 lg:p-8">
          {/* Brand header */}
          <LexoraLogo size="md" />

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#2D2A26]">Calibration</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6B6560]">
              We need to calibrate the eye tracker before the test. First, follow the target with
              your eyes. Then, read a short paragraph so we can fine-tune accuracy for reading.
            </p>
          </div>

          {/* Pre-calibration instructions */}
          <div className="rounded-xl border border-[#4A7C59]/15 bg-[#4A7C59]/5 p-4">
            <p className="mb-2 text-sm font-semibold text-[#2D2A26]">📋 Before you start:</p>
            <ul className="list-inside list-disc space-y-1.5 text-[13px] text-[#6B6560]">
              <li>Sit at a comfortable distance (about arm&apos;s length)</li>
              <li>Keep your head still — move only your eyes</li>
              <li>Make sure your face is well-lit</li>
              <li>The reading check takes about 15–25 seconds</li>
            </ul>
          </div>

          {/* Fullscreen consent */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 text-xs leading-relaxed text-[#6B6560]">
            <Maximize className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Calibration requires <strong className="text-[#2D2A26]">fullscreen mode</strong> for
              accurate tracking. Press{' '}
              <kbd className="rounded border border-[#E8E0D4] bg-white/80 px-1 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              to exit anytime.
            </span>
          </div>

          {/* Start button */}
          <Button
            onClick={onStart}
            size="lg"
            className="mt-auto w-full bg-[#4A7C59] px-10 text-white hover:bg-[#3D6A4B]"
          >
            {startButtonText}
          </Button>
        </div>

        {/* ── Right: Mode selection ── */}
        <div className="flex flex-1 flex-col gap-4 border-t border-[#E8E0D4] bg-[#FAFAF7] p-7 lg:border-t-0 lg:border-l lg:p-8">
          <div>
            <p className="mb-1 text-sm font-medium text-[#2D2A26]">Choose a calibration style</p>
            <p className="text-xs text-[#8B857E]">
              Each style works the same way, just with a different look.
            </p>
          </div>

          <div className="flex flex-col gap-3">
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
                    'group flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-all',
                    isSelected
                      ? 'border-[#4A7C59] bg-[#4A7C59]/5 shadow-md shadow-[#4A7C59]/10'
                      : isDisabled
                        ? 'cursor-not-allowed border-[#E8E0D4] bg-[#F5F0E8]/70 opacity-70'
                        : 'border-transparent bg-white/80 hover:border-[#D4CBBD] hover:bg-white',
                  )}
                >
                  {/* Mode image */}
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F5F0E8]">
                    <Image
                      src={option.image}
                      alt={option.label}
                      fill
                      className={cn(
                        'object-cover transition-transform',
                        !isDisabled && 'group-hover:scale-105',
                      )}
                      sizes="80px"
                    />
                    {isSelected && !isDisabled && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-[#4A7C59]/30 ring-inset" />
                    )}
                  </div>

                  {/* Mode info */}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#2D2A26]">{option.label}</span>
                      {option.comingSoon && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <span className="line-clamp-2 text-xs leading-relaxed text-[#6B6560]">
                      {option.description}
                    </span>
                    <span className="mt-0.5 text-[10px] text-[#8B857E]">{option.ageHint}</span>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && !isDisabled && (
                    <div className="ml-auto h-3 w-3 shrink-0 rounded-full bg-[#4A7C59]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
