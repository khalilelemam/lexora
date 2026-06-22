'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { CheckCircle2, Maximize, Monitor, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { StarGameVisual } from '../pre-test-slides';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';
import { MODE_OPTIONS, type CalibrationModeOption } from './calibration-constants';

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
  startButtonText = 'Start Calibration',
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#e3dcc2]">
      <div className="flex h-full min-h-0 items-center justify-center p-3 sm:p-5 lg:p-7">
        <div
          className="grid max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-7xl overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] shadow-[0_24px_70px_rgba(27,32,33,0.16)] lg:max-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.9fr)_minmax(19rem,0.72fr)]"
          style={{ animation: 'float-up 0.5s ease-out' }}
        >
          <section className="flex min-h-0 flex-col overflow-y-auto border-b border-[#51513d]/18 p-5 sm:p-7 lg:border-r lg:border-b-0 lg:p-8 xl:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#51513d]/18 bg-[#e3dcc2]">
                <LexoraLogo size="sm" showText={false} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.24em] text-[#51513d] uppercase">
                  Calibration setup
                </p>
                <p className="mt-1 text-xs font-bold text-[#1b2021]/54">
                  {tracker === 'tobii' ? 'Tobii eye tracker' : 'Webcam tracking'}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-3xl leading-tight font-black tracking-tight text-[#1b2021] xl:text-4xl">
                Prepare for calibration
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#1b2021]/68 sm:text-base">
                Follow each target with your eyes while your head stays still. This maps gaze points
                to screen coordinates before reading starts.
              </p>
            </div>

            <div className="mt-7 grid gap-3">
              <SetupCheck>Stay about arm&apos;s length from the screen.</SetupCheck>
              {tracker === 'webcam' && (
                <SetupCheck emphasis>
                  Keep webcam slightly above eye level so lower targets remain trackable.
                </SetupCheck>
              )}
              <SetupCheck>Keep head still. Move eyes only.</SetupCheck>
              <SetupCheck>Use even room lighting and avoid glare.</SetupCheck>
            </div>

            <div className="mt-7 flex items-start gap-3 border border-[#e3dc95]/70 bg-[#e3dc95]/22 p-4 text-sm leading-relaxed text-[#1b2021]/78">
              <Maximize className="mt-0.5 h-5 w-5 shrink-0 text-[#51513d]" />
              <p>
                Calibration opens in <strong className="text-[#1b2021]">fullscreen</strong>. Press{' '}
                <kbd className="mx-1 border border-[#51513d]/18 bg-[#e3dcc2] px-1.5 py-0.5 font-mono text-xs font-bold shadow-sm">
                  Esc
                </kbd>{' '}
                to exit anytime.
              </p>
            </div>

            <div className="mt-auto pt-7">
              <Button
                onClick={onStart}
                size="lg"
                className="h-14 w-full bg-[#51513d] text-sm font-black text-[#e3dcc2] shadow-[6px_6px_0_rgba(81,81,61,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#1b2021] hover:shadow-[8px_8px_0_rgba(81,81,61,.18)] sm:text-base"
              >
                {startButtonText}
              </Button>
              <p className="mt-3 text-center text-xs font-medium text-[#1b2021]/58">
                Press{' '}
                <kbd className="mx-1 border border-[#51513d]/18 bg-[#e3dcc2] px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-sm">
                  Enter ↵
                </kbd>{' '}
                to start
              </p>
            </div>
          </section>

          <section className="flex min-h-0 flex-col border-b border-[#51513d]/18 bg-[#e3dcc2]/28 p-5 sm:p-7 lg:border-r lg:border-b-0 lg:p-8 xl:p-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.24em] text-[#51513d] uppercase">
                  Live preview
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-[#1b2021]">
                  Target path
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center border border-[#51513d]/18 bg-[#f3edd7] text-[#51513d]">
                <Target className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex min-h-80 flex-1 flex-col items-center justify-center overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] p-4 shadow-[8px_8px_0_rgba(81,81,61,.08)] sm:min-h-96 lg:min-h-0">
              <div className="mb-5 w-full max-w-136 sm:mb-7">
                <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#51513d]/50">
                  What to expect in the test
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col items-center border border-[#51513d]/12 bg-[#e3dcc2]/40 p-4 text-center sm:items-start sm:text-left">
                    <div className="mb-2.5 h-2 w-2 animate-pulse rounded-full bg-[#a6a867]" />
                    <p className="text-xs font-bold text-[#1b2021]">1. Popping Dots</p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#1b2021]/60">
                      Look directly at the shrinking dots as they appear. This helps the camera learn your unique eye movements.
                    </p>
                  </div>
                  <div className="flex flex-col items-center border border-[#51513d]/12 bg-[#e3dcc2]/40 p-4 text-center sm:items-start sm:text-left">
                    <div className="mb-2.5 flex w-[28px] items-center">
                      <div className="h-2 w-2 rounded-full bg-[#1b2021]" />
                      <div className="ml-1 h-[1px] flex-1 bg-[#1b2021]/20" />
                    </div>
                    <p className="text-xs font-bold text-[#1b2021]">2. Moving Target</p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#1b2021]/60">
                      Follow the dark dot smoothly across the screen. This checks how your eyes will track along lines of text.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="relative aspect-4/3 w-full max-w-136 overflow-hidden border border-[#51513d]/16 bg-[#e3dcc2] shadow-sm">
                <DualPhaseVisual resolvedMode={resolvedMode} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="border border-[#51513d]/14 bg-[#f3edd7] p-3">
                <p className="font-black text-[#1b2021]">20 fixation points</p>
                <p className="mt-1 text-[#1b2021]/56">Corners, edges, center</p>
              </div>
              <div className="border border-[#51513d]/14 bg-[#f3edd7] p-3">
                <p className="font-black text-[#1b2021]">Smooth pursuit</p>
                <p className="mt-1 text-[#1b2021]/56">Horizontal tracking pass</p>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-y-auto p-5 sm:p-7 lg:p-8 xl:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#51513d]/18 bg-[#e3dcc2] text-[#51513d]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.24em] text-[#51513d] uppercase">
                  Style
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-[#1b2021]">
                  Select mode
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#1b2021]/62">
              Each style captures same calibration points. Pick calm grid for most sessions.
            </p>

            <div className="mt-6 grid gap-3">
              {MODE_OPTIONS.map((option) => (
                <ModeOptionButton
                  key={option.key}
                  option={option}
                  selected={resolvedMode === option.key}
                  onSelect={onSelectMode}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SetupCheck({ children, emphasis = false }: { children: ReactNode; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 border p-3 text-sm leading-relaxed',
        emphasis
          ? 'border-[#a6a867]/45 bg-[#a6a867]/12 text-[#51513d]'
          : 'border-[#51513d]/14 bg-[#e3dcc2]/48 text-[#1b2021]/72',
      )}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#51513d]" />
      <span className={cn(emphasis && 'font-bold')}>{children}</span>
    </div>
  );
}

function ModeOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: CalibrationModeOption;
  selected: boolean;
  onSelect: (mode: CalibrationVisualMode) => void;
}) {
  const disabled = option.disabled === true;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect(option.key);
      }}
      className={cn(
        'group relative flex min-h-25 items-center gap-3 border p-3 text-left transition-all duration-200',
        selected
          ? 'border-[#51513d] bg-[#f3edd7] shadow-[5px_5px_0_rgba(81,81,61,.16)]'
          : disabled
            ? 'cursor-not-allowed border-[#51513d]/10 bg-[#e3dcc2]/45 opacity-65 grayscale'
            : 'border-[#51513d]/14 bg-[#f3edd7]/72 hover:-translate-y-0.5 hover:border-[#51513d]/35 hover:bg-[#f3edd7]',
      )}
    >
      <div className="relative h-16 w-24 shrink-0 overflow-hidden border border-[#51513d]/14 bg-[#e3dcc2]">
        <Image
          src={option.image}
          alt={option.label}
          fill
          className={cn(
            'object-cover transition-transform duration-500',
            !disabled && 'group-hover:scale-105',
          )}
          sizes="84px"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-[#1b2021]">{option.label}</span>
          {option.comingSoon && (
            <span className="bg-[#51513d] px-2 py-0.5 text-[9px] font-black tracking-widest text-[#e3dc95] uppercase">
              Soon
            </span>
          )}
        </div>
        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[#1b2021]/62">
          {option.description}
        </span>
      </div>

      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-[#51513d] bg-[#51513d]' : 'border-[#51513d]/24',
          disabled && 'opacity-0',
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-[#e3dcc2]" />}
      </div>
    </button>
  );
}

function DualPhaseVisual({ resolvedMode }: { resolvedMode: CalibrationVisualMode }) {
  const [phase, setPhase] = useState<'circles' | 'pursuit'>('circles');

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => (prev === 'circles' ? 'pursuit' : 'circles'));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e3dcc2]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(227,220,149,0.38),transparent_28%),radial-gradient(circle_at_80%_78%,rgba(166,168,103,0.24),transparent_30%)]" />

      <div
        className="absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: phase === 'circles' ? 1 : 0 }}
      >
        {resolvedMode === 'star' ? <StarGameVisual /> : <CalibrationPointPreview />}
      </div>
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: phase === 'pursuit' ? 1 : 0 }}
      >
        <PursuitVisual />
      </div>

      <div className="absolute bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        <div className="flex items-center justify-center gap-3 border border-[#51513d]/18 bg-[#f3edd7]/90 px-3 py-2 text-[9px] font-black tracking-widest text-[#51513d] uppercase shadow-[4px_4px_0_rgba(81,81,61,.1)] backdrop-blur-sm sm:text-[10px]">
          <span
            className={`transition-opacity duration-500 ${phase === 'circles' ? 'opacity-100' : 'opacity-40'}`}
          >
            Fixation points
          </span>
          <span className="text-[#51513d]/25">|</span>
          <span
            className={`transition-opacity duration-500 ${phase === 'pursuit' ? 'opacity-100' : 'opacity-40'}`}
          >
            Smooth pursuit
          </span>
        </div>
      </div>
    </div>
  );
}

function CalibrationPointPreview() {
  const [activeIndex, setActiveIndex] = useState(0);

  const points = [
    [20, 15], [35, 15], [50, 15], [65, 15], [80, 15],
    [20, 30], [35, 30], [50, 30], [65, 30], [80, 30],
    [20, 45], [35, 45], [50, 45], [65, 45], [80, 45],
    [20, 60], [35, 60], [50, 60], [65, 60], [80, 60],
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % points.length);
    }, 1500); // Fast miniature preview
    return () => clearInterval(timer);
  }, [points.length]);

  const activePoint = points[activeIndex] ?? [50, 50];

  return (
    <div className="absolute inset-0">
      {/* 1. Base Grid Points */}
      {points.map(([left, top], index) => {
        const visited = index < activeIndex;
        if (index === activeIndex) return null; // Don't render base point for active

        return (
          <div
            key={`base-${left}-${top}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {visited ? (
              <div className="relative flex h-2 w-2 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[#a6a867]/20 bg-[#a6a867]/10" />
                <div className="h-1 w-1 rounded-full bg-[#a6a867]/60" />
              </div>
            ) : (
              <div className="h-1 w-1 rounded-full bg-[#51513d]/25" />
            )}
          </div>
        );
      })}

      {/* 2. Active Animated Point */}
      <motion.div
        key={`active-${activeIndex}`}
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${activePoint[0]}%`,
          top: `${activePoint[1]}%`,
        }}
      >
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full">
          <motion.div
            className="absolute inset-0 rounded-full bg-[#a6a867]/15 shadow-[0_0_12px_rgba(166,168,103,0.24)]"
            animate={{ scale: [1, 1.08, 1], opacity: [1, 0.85, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-1 rounded-full border border-[#a6a867]/30" />
          <motion.div 
            initial={{ scale: 1 }}
            animate={{ scale: 0 }}
            transition={{ duration: 1.5, ease: 'linear' }}
            className="absolute inset-0.5 rounded-full border border-[#e3dcc2] bg-[#a6a867] shadow-sm"
          />
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(81,81,61,0.03)" strokeWidth="4" />
            <motion.circle 
              cx="50" cy="50" r="44" fill="none" stroke="#a6a867" strokeWidth="4" 
              strokeDasharray={276} 
              initial={{ strokeDashoffset: 276 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, ease: 'linear' }}
              strokeLinecap="round" 
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

function PursuitVisual() {
  const [lineIndex, setLineIndex] = useState(0);

  // 5 lines matching real AOI constraints
  const lines = [15, 26.25, 37.5, 48.75, 60];

  useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % lines.length);
    }, 2000); // 1.5s sweep + 0.5s pause
    return () => clearInterval(timer);
  }, [lines.length]);

  const currentY = lines[lineIndex] ?? 15;

  return (
    <div className="relative h-full w-full bg-[#e3dcc2] overflow-hidden">
      {/* 5 Guide Lines */}
      {lines.map((y) => (
        <div
          key={y}
          className="absolute h-[2px] bg-[#1b2021]/10"
          style={{ top: `${y}%`, left: '20%', width: '60%' }}
        />
      ))}

      {/* Target Dot */}
      <div
        key={`pursuit-dot-${lineIndex}`}
        className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-[#1b2021] bg-[#a6a867] shadow-[3px_3px_0_0_#1b2021]"
        style={{
          top: `${currentY}%`,
          animation: 'pursuit-sweep 1.5s ease-in-out forwards',
        }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-[#1b2021]" />
      </div>

      <style jsx>{`
        @keyframes pursuit-sweep {
          0% { left: 20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 80%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
