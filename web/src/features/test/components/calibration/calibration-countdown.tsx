'use client';

import { Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalibrationVisualMode } from '../../hooks/use-calibration-engine';

interface CalibrationCountdownProps {
  countdown: number;
  resolvedMode: CalibrationVisualMode;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

const MODE_LABELS: Record<CalibrationVisualMode, string> = {
  grid: 'Classic Grid',
  stickman: 'Action Stickman',
  star: 'Gentle Star',
};

export function CalibrationCountdown({
  countdown,
  resolvedMode,
  voiceEnabled,
  onToggleVoice,
}: CalibrationCountdownProps) {
  return (
    <div className="z-50 fixed inset-0 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.18),transparent_50%),radial-gradient(circle_at_80%_85%,hsl(var(--accent)/0.12),transparent_50%),hsl(var(--background))] cursor-none">
      <div
        className="flex flex-col items-center gap-5 bg-card/90 backdrop-blur-sm px-8 py-8 border rounded-2xl shadow-lg"
        style={{ animation: 'float-up 0.4s ease-out' }}
      >
        <Sparkles className="w-12 h-12 text-primary" />
        <h2 className="font-bold text-2xl tracking-tight">Calibration Quest</h2>
        <p className="max-w-md text-muted-foreground text-center text-sm leading-relaxed">
          Follow the target with your eyes and hold steady. We only collect samples during stable
          fixation for better accuracy.
        </p>
        <p className="text-muted-foreground text-sm">
          Mode: <span className="font-semibold text-foreground">{MODE_LABELS[resolvedMode]}</span>
        </p>

        <div className="relative flex justify-center items-center mt-2 w-24 h-24">
          {/* Animated ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48" cy="48" r="44"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <circle
              cx="48" cy="48" r="44"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${44 * 2 * Math.PI}`}
              strokeDashoffset={`${44 * 2 * Math.PI * (1 - countdown / 3)}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <span className="font-bold text-primary text-4xl">{countdown}</span>
        </div>

        <Button variant="outline" size="sm" onClick={onToggleVoice}>
          {voiceEnabled ? (
            <><Volume2 className="mr-2 w-4 h-4" /> Voice On</>
          ) : (
            <><VolumeX className="mr-2 w-4 h-4" /> Voice Off</>
          )}
        </Button>
      </div>
    </div>
  );
}
