'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Maximize, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import type { CalibrationVisualMode } from '../../lib/calibration-mode';

interface CalibrationSetupProps {
  tracker?: 'webcam' | 'tobii';
  resolvedMode?: CalibrationVisualMode;
  onSelectMode?: (mode: CalibrationVisualMode) => void;
  onStart: () => void;
  startButtonText?: string;
}

/**
 * Calibration setup — streamlined 2-column layout.
 * Left: Instructions + fullscreen consent + start button
 * Right: Live preview of calibration targets
 */
export function CalibrationSetup({
  tracker = 'webcam',
  resolvedMode = 'grid',
  onStart,
  startButtonText = 'ابدأ المعايرة (Start Calibration)',
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
          className="grid max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-5xl overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] shadow-[0_24px_70px_rgba(27,32,33,0.16)] lg:max-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(26rem,1.15fr)]"
          style={{ animation: 'float-up 0.5s ease-out' }}
        >
          {/* Instructions Column */}
          <section className="flex min-h-0 flex-col overflow-y-auto border-b border-[#51513d]/18 p-6 sm:p-8 lg:border-r lg:border-b-0 lg:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#51513d]/18 bg-[#e3dcc2]">
                <LexoraLogo size="sm" showText={false} />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.24em] text-[#51513d] uppercase">
                  معايرة حركة العين
                </p>
                <p className="mt-0.5 text-xs font-bold text-[#1b2021]/60">
                  كاميرا الويب (Webcam Calibration)
                </p>
              </div>
            </div>

            <div className="mt-7">
              <h2 className="text-2xl leading-tight font-black tracking-tight text-[#1b2021] sm:text-3xl">
                الاستعداد للمعايرة
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#1b2021]/75">
                اتبع النقطة بعينيك فقط مع الحفاظ على ثبات الرأس. تقوم هذه المرحلة بتعليم الكاميرا خريطة شاشتك لضمان دقة قياس القراءة.
              </p>
            </div>

            <div className="mt-6 grid gap-2.5">
              <SetupCheck>اجلس على مسافة ذراع تقريباً من الشاشة.</SetupCheck>
              <SetupCheck emphasis>
                اجعل الكاميرا في مستوى العينين أو أعلى قليلاً.
              </SetupCheck>
              <SetupCheck>حافظ على ثبات الرأس وحرّك عينيك فقط لتتبع النقطة.</SetupCheck>
              <SetupCheck>تأكد من وجود إضاءة جيدة وتجنب الوهج المباشر خلفك.</SetupCheck>
            </div>

            <div className="mt-6 flex items-start gap-3 border border-[#e3dc95]/70 bg-[#e3dc95]/22 p-3.5 text-xs leading-relaxed text-[#1b2021]/80">
              <Maximize className="mt-0.5 h-4 w-4 shrink-0 text-[#51513d]" />
              <p>
                ستفتح المعايرة في <strong className="text-[#1b2021]">وضع ملء الشاشة</strong>. يمكنك الخروج في أي وقت بالضغط على{' '}
                <kbd className="mx-1 border border-[#51513d]/18 bg-[#e3dcc2] px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-sm">
                  Esc
                </kbd>
              </p>
            </div>

            <div className="mt-auto pt-6">
              <Button
                onClick={onStart}
                size="lg"
                className="h-13 w-full bg-[#51513d] text-sm font-black text-[#e3dcc2] shadow-[6px_6px_0_rgba(81,81,61,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#1b2021] hover:shadow-[8px_8px_0_rgba(81,81,61,.18)] sm:text-base"
              >
                {startButtonText}
              </Button>
              <p className="mt-2.5 text-center text-xs font-medium text-[#1b2021]/58">
                اضغط على{' '}
                <kbd className="mx-1 border border-[#51513d]/18 bg-[#e3dcc2] px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-sm">
                  Enter ↵
                </kbd>{' '}
                للبدء
              </p>
            </div>
          </section>

          {/* Preview Column */}
          <section className="flex min-h-0 flex-col border-b border-[#51513d]/18 bg-[#e3dcc2]/28 p-6 sm:p-8 lg:border-b-0 lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.24em] text-[#51513d] uppercase">
                  معاينة توضيحية
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-[#1b2021]">
                  مسار المعايرة (Grid Calibration)
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center border border-[#51513d]/18 bg-[#f3edd7] text-[#51513d]">
                <Target className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex min-h-72 flex-1 flex-col items-center justify-center overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] p-4 shadow-[8px_8px_0_rgba(81,81,61,.08)]">
              <div className="mb-4 w-full max-w-136">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="flex flex-col items-start border border-[#51513d]/12 bg-[#e3dcc2]/40 p-3 text-right">
                    <div className="mb-2 h-2 w-2 animate-pulse rounded-full bg-[#a6a867]" />
                    <p className="text-xs font-bold text-[#1b2021]">1. نقاط التثبيت (Fixation)</p>
                    <p className="mt-1 text-[11px] leading-relaxed font-medium text-[#1b2021]/60">
                      انظر مباشرة إلى النقطة الثابتة عند ظهورها حتى تنتقل.
                    </p>
                  </div>
                  <div className="flex flex-col items-start border border-[#51513d]/12 bg-[#e3dcc2]/40 p-3 text-right">
                    <div className="mb-2 flex w-[28px] items-center">
                      <div className="h-2 w-2 rounded-full bg-[#1b2021]" />
                      <div className="ml-1 h-[1px] flex-1 bg-[#1b2021]/20" />
                    </div>
                    <p className="text-xs font-bold text-[#1b2021]">2. التتبع السلس (Pursuit)</p>
                    <p className="mt-1 text-[11px] leading-relaxed font-medium text-[#1b2021]/60">
                      اتبع النقطة المتحركة بسلاسة عبر الشاشة.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative aspect-4/3 w-full max-w-136 overflow-hidden border border-[#51513d]/16 bg-[#e3dcc2] shadow-sm">
                <DualPhaseVisual resolvedMode={resolvedMode} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="border border-[#51513d]/14 bg-[#f3edd7] p-3 text-right">
                <p className="font-black text-[#1b2021]">نقاط الشبكة الدقيقة</p>
                <p className="mt-0.5 text-[#1b2021]/56">تغطي الأركان والوسط والمحيط</p>
              </div>
              <div className="border border-[#51513d]/14 bg-[#f3edd7] p-3 text-right">
                <p className="font-black text-[#1b2021]">مسار سلس أفقي</p>
                <p className="mt-0.5 text-[#1b2021]/56">لمحاكاة حركة العين أثناء قراءة السطور</p>
              </div>
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
        'flex items-start gap-3 border p-3 text-xs sm:text-sm leading-relaxed text-right',
        emphasis
          ? 'border-[#a6a867]/45 bg-[#a6a867]/12 text-[#51513d]'
          : 'border-[#51513d]/14 bg-[#e3dcc2]/35 text-[#1b2021]/78',
      )}
    >
      <div
        className={cn(
          'mt-1 h-2 w-2 shrink-0 rounded-full',
          emphasis ? 'bg-[#51513d]' : 'bg-[#a6a867]',
        )}
      />
      <div className="flex-1">{children}</div>
    </div>
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
        <CalibrationPointPreview />
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
            نقاط التثبيت (Fixation)
          </span>
          <span className="text-[#51513d]/25">|</span>
          <span
            className={`transition-opacity duration-500 ${phase === 'pursuit' ? 'opacity-100' : 'opacity-40'}`}
          >
            التتبع السلس (Pursuit)
          </span>
        </div>
      </div>
    </div>
  );
}

function CalibrationPointPreview() {
  const [activeIndex, setActiveIndex] = useState(0);

  const points = [
    [20, 15],
    [50, 15],
    [80, 15],
    [35, 50],
    [65, 50],
    [20, 85],
    [50, 85],
    [80, 85],
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % points.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [points.length]);

  return (
    <div className="relative h-full w-full">
      {points.map(([x, y], idx) => {
        const isActive = idx === activeIndex;
        return (
          <div
            key={idx}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className={cn(
                'rounded-full transition-all duration-300',
                isActive
                  ? 'h-6 w-6 bg-[#51513d] shadow-[0_0_12px_rgba(81,81,61,0.5)] ring-4 ring-[#a6a867]/40'
                  : 'h-2.5 w-2.5 bg-[#51513d]/25',
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function PursuitVisual() {
  const [pos, setPos] = useState(20);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const anim = setInterval(() => {
      setPos((prev) => {
        if (prev >= 80) setDir(-1);
        if (prev <= 20) setDir(1);
        return prev + dir * 1.5;
      });
    }, 40);
    return () => clearInterval(anim);
  }, [dir]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-1/2 left-[20%] right-[20%] h-0.5 -translate-y-1/2 bg-[#51513d]/15" />
      <div
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#51513d] shadow-[0_0_10px_rgba(81,81,61,0.4)] ring-4 ring-[#a6a867]/35"
        style={{ left: `${pos}%` }}
      />
    </div>
  );
}
