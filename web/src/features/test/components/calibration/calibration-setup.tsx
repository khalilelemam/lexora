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
export function CalibrationSetup({
  resolvedMode,
  onSelectMode,
  onStart,
}: CalibrationSetupProps) {
  return (
    <div className="z-50 fixed inset-0 flex items-center justify-center bg-[#FDF8F0] overflow-auto py-6 px-4">
      <div
        className="flex flex-col lg:flex-row gap-6 lg:gap-0 bg-white/80 backdrop-blur-sm border border-[#E8E0D4] rounded-2xl shadow-lg w-[min(960px,95vw)] overflow-hidden"
        style={{ animation: 'float-up 0.5s ease-out' }}
      >
        {/* ── Left: Instructions ── */}
        <div className="flex flex-col gap-5 p-7 lg:p-8 lg:w-[420px] shrink-0">
          {/* Brand header */}
          <LexoraLogo size="md" />

          <div>
            <h2 className="font-bold text-2xl tracking-tight text-[#2D2A26]">Calibration</h2>
            <p className="mt-2 text-[#6B6560] text-sm leading-relaxed">
              We need to calibrate the eye tracker before the test. Follow the target with your eyes — it only takes about 30–60 seconds.
            </p>
          </div>

          {/* Pre-calibration instructions */}
          <div className="bg-[#4A7C59]/5 border border-[#4A7C59]/15 rounded-xl p-4">
            <p className="font-semibold text-[#2D2A26] text-sm mb-2">📋 Before you start:</p>
            <ul className="space-y-1.5 text-[#6B6560] text-[13px] list-disc list-inside">
              <li>Sit at a comfortable distance (about arm&apos;s length)</li>
              <li>Keep your head still — move only your eyes</li>
              <li>Make sure your face is well-lit</li>
              <li>The calibration takes about 30–60 seconds</li>
            </ul>
          </div>

          {/* Fullscreen consent */}
          <div className="flex items-start gap-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-[#6B6560] text-xs leading-relaxed">
            <Maximize className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Calibration requires <strong className="text-[#2D2A26]">fullscreen mode</strong> for
              accurate tracking. Press <kbd className="bg-white/80 border border-[#E8E0D4] px-1 py-0.5 rounded text-[10px] font-mono">Esc</kbd> to exit anytime.
            </span>
          </div>

          {/* Start button */}
          <Button
            onClick={onStart}
            size="lg"
            className="w-full px-10 bg-[#4A7C59] hover:bg-[#3D6A4B] text-white mt-auto"
          >
            Enter Fullscreen & Start Calibration
          </Button>
        </div>

        {/* ── Right: Mode selection ── */}
        <div className="flex flex-col gap-4 p-7 lg:p-8 bg-[#FAFAF7] border-t lg:border-t-0 lg:border-l border-[#E8E0D4] flex-1">
          <div>
            <p className="font-medium text-sm text-[#2D2A26] mb-1">Choose a calibration style</p>
            <p className="text-[#8B857E] text-xs">Each style works the same way, just with a different look.</p>
          </div>

          <div className="flex flex-col gap-3">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectMode(option.key)}
                className={cn(
                  'group flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-all',
                  resolvedMode === option.key
                    ? 'border-[#4A7C59] bg-[#4A7C59]/5 shadow-md shadow-[#4A7C59]/10'
                    : 'border-transparent bg-white/80 hover:bg-white hover:border-[#D4CBBD]',
                )}
              >
                {/* Mode image */}
                <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-[#F5F0E8]">
                  <Image
                    src={option.image}
                    alt={option.label}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="80px"
                  />
                  {resolvedMode === option.key && (
                    <div className="absolute inset-0 ring-2 ring-inset ring-[#4A7C59]/30 rounded-lg" />
                  )}
                </div>

                {/* Mode info */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-sm text-[#2D2A26]">{option.label}</span>
                  <span className="text-[#6B6560] text-xs leading-relaxed line-clamp-2">
                    {option.description}
                  </span>
                  <span className="text-[10px] text-[#8B857E] mt-0.5">{option.ageHint}</span>
                </div>

                {/* Selected indicator */}
                {resolvedMode === option.key && (
                  <div className="w-3 h-3 rounded-full bg-[#4A7C59] shrink-0 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
