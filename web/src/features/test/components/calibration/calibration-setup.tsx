'use client';

import Image from 'next/image';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';
import { MODE_OPTIONS } from './calibration-constants';

interface CalibrationSetupProps {
  resolvedMode: CalibrationVisualMode;
  voiceEnabled: boolean;
  onSelectMode: (mode: CalibrationVisualMode) => void;
  onToggleVoice: () => void;
  onStart: () => void;
}

export function CalibrationSetup({
  resolvedMode,
  voiceEnabled,
  onSelectMode,
  onToggleVoice,
  onStart,
}: CalibrationSetupProps) {
  return (
    <div className="z-50 fixed inset-0 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.18),transparent_50%),radial-gradient(circle_at_80%_85%,hsl(var(--accent)/0.12),transparent_50%),hsl(var(--background))] overflow-auto py-8">
      <div
        className="flex flex-col items-center gap-6 bg-card/90 backdrop-blur-sm px-8 py-8 border rounded-2xl shadow-lg w-[min(760px,92vw)]"
        style={{ animation: 'float-up 0.5s ease-out' }}
      >
        <div className="flex items-center justify-center rounded-2xl bg-primary/10 p-3.5">
          <Sparkles className="w-9 h-9 text-primary" />
        </div>

        <div className="text-center">
          <h2 className="font-bold text-2xl tracking-tight">Calibration Setup</h2>
          <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-relaxed">
            We need to calibrate the eye tracker before the test. Pick a calibration style
            below — each one works the same way, just with a different visual experience.
          </p>
        </div>

        {/* Pre-calibration instructions */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 w-full">
          <p className="font-semibold text-foreground text-sm mb-2">📋 Before you start:</p>
          <ul className="space-y-1.5 text-muted-foreground text-[13px] list-disc list-inside">
            <li>Sit at a comfortable distance from the screen (about arm&apos;s length)</li>
            <li>Keep your head still — move only your eyes to follow the target</li>
            <li>Make sure your face is well-lit and clearly visible to the camera</li>
            <li>The calibration takes about 30–60 seconds</li>
          </ul>
        </div>

        {/* Mode selection cards with images */}
        <div className="w-full">
          <p className="mb-3 text-muted-foreground text-sm font-medium">
            Choose calibration style:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectMode(option.key)}
                className={cn(
                  'group flex flex-col rounded-xl border-2 text-left transition-all overflow-hidden',
                  resolvedMode === option.key
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-transparent bg-muted/40 hover:bg-muted/70 hover:border-muted-foreground/20',
                )}
              >
                {/* Mode image */}
                <div className="relative w-full aspect-[16/10] bg-muted/60 overflow-hidden">
                  <Image
                    src={option.image}
                    alt={option.label}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 90vw, 240px"
                  />
                  {resolvedMode === option.key && (
                    <div className="absolute inset-0 bg-primary/10 ring-2 ring-inset ring-primary/30" />
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <span className="font-semibold text-sm">{option.label}</span>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {option.description}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 mt-auto pt-1.5">
                    {option.ageHint}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onToggleVoice}>
            {voiceEnabled ? (
              <><Volume2 className="mr-2 w-4 h-4" /> Voice On</>
            ) : (
              <><VolumeX className="mr-2 w-4 h-4" /> Voice Off</>
            )}
          </Button>
          <Button onClick={onStart} size="lg" className="px-8">
            Start Calibration
          </Button>
        </div>
      </div>
    </div>
  );
}
