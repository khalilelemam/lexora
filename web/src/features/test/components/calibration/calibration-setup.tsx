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
}

/**
 * Calibration setup — horizontal split layout.
 *
 * Left: Instructions + fullscreen consent + start button
 * Right: Mode selection cards
 */
export function CalibrationSetup({ resolvedMode, onSelectMode, onStart }: CalibrationSetupProps) {
  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-[#FDF8F0] px-4 py-6 overflow-auto">
      <div
        className="flex lg:flex-row flex-col gap-6 lg:gap-0 bg-white/80 shadow-lg backdrop-blur-sm border border-[#E8E0D4] rounded-2xl w-[min(960px,95vw)] overflow-hidden"
        style={{ animation: 'float-up 0.5s ease-out' }}
      >
        {/* ── Left: Instructions ── */}
        <div className="flex flex-col gap-5 p-7 lg:p-8 lg:w-105 shrink-0">
          {/* Brand header */}
          <LexoraLogo size="md" />

          <div>
            <h2 className="font-bold text-[#2D2A26] text-2xl tracking-tight">Calibration</h2>
            <p className="mt-2 text-[#6B6560] text-sm leading-relaxed">
              We need to calibrate the eye tracker before the test. Follow the target with your eyes
              — it only takes about 30–60 seconds.
            </p>
          </div>

          {/* Pre-calibration instructions */}
          <div className="bg-[#4A7C59]/5 p-4 border border-[#4A7C59]/15 rounded-xl">
            <p className="mb-2 font-semibold text-[#2D2A26] text-sm">📋 Before you start:</p>
            <ul className="space-y-1.5 text-[#6B6560] text-[13px] list-disc list-inside">
              <li>Sit at a comfortable distance (about arm&apos;s length)</li>
              <li>Keep your head still — move only your eyes</li>
              <li>Make sure your face is well-lit</li>
              <li>The calibration takes about 30–60 seconds</li>
            </ul>
          </div>

          {/* Fullscreen consent */}
          <div className="flex items-start gap-2.5 bg-amber-50/60 p-3 border border-amber-200/60 rounded-xl text-[#6B6560] text-xs leading-relaxed">
            <Maximize className="mt-0.5 w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Calibration requires <strong className="text-[#2D2A26]">fullscreen mode</strong> for
              accurate tracking. Press{' '}
              <kbd className="bg-white/80 px-1 py-0.5 border border-[#E8E0D4] rounded font-mono text-[10px]">
                Esc
              </kbd>{' '}
              to exit anytime.
            </span>
          </div>

          {/* Start button */}
          <Button
            onClick={onStart}
            size="lg"
            className="bg-[#4A7C59] hover:bg-[#3D6A4B] mt-auto px-10 w-full text-white"
          >
            Enter Fullscreen & Start Calibration
          </Button>
        </div>

        {/* ── Right: Mode selection ── */}
        <div className="flex flex-col flex-1 gap-4 bg-[#FAFAF7] p-7 lg:p-8 border-[#E8E0D4] border-t lg:border-t-0 lg:border-l">
          <div>
            <p className="mb-1 font-medium text-[#2D2A26] text-sm">Choose a calibration style</p>
            <p className="text-[#8B857E] text-xs">
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
                    'group flex items-center gap-4 p-3 border-2 rounded-xl text-left transition-all',
                    isSelected
                      ? 'border-[#4A7C59] bg-[#4A7C59]/5 shadow-md shadow-[#4A7C59]/10'
                      : isDisabled
                        ? 'cursor-not-allowed border-[#E8E0D4] bg-[#F5F0E8]/70 opacity-70'
                        : 'border-transparent bg-white/80 hover:border-[#D4CBBD] hover:bg-white',
                  )}
                >
                  {/* Mode image */}
                  <div className="relative bg-[#F5F0E8] rounded-lg w-20 h-14 overflow-hidden shrink-0">
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
                      <div className="absolute inset-0 rounded-lg ring-[#4A7C59]/30 ring-2 ring-inset" />
                    )}
                  </div>

                  {/* Mode info */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#2D2A26] text-sm">{option.label}</span>
                      {option.comingSoon && (
                        <span className="bg-amber-100 px-1.5 py-0.5 rounded-full font-semibold text-[10px] text-amber-700 uppercase tracking-wide">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <span className="text-[#6B6560] text-xs line-clamp-2 leading-relaxed">
                      {option.description}
                    </span>
                    <span className="mt-0.5 text-[#8B857E] text-[10px]">{option.ageHint}</span>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && !isDisabled && (
                    <div className="bg-[#4A7C59] ml-auto rounded-full w-3 h-3 shrink-0" />
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
