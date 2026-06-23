'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Brain,
  Info,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  Timer,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';
import type { AttemptVisualization } from '@/features/attempts/types';
import { AttemptVisualizationOverlay } from '@/features/attempts/components/attempt-visualization-overlay';
import { AOI_X_BOUNDS, AOI_Y_BOUNDS, READING_ZONE_BOUNDS } from '@/features/test/lib/constants';
import {
  calculateDerivedGazeAnalysis,
  calculateReadingAnalysis,
  sanitizeRawGaze,
  type RawReadingGazePoint,
} from '@/features/test/lib/gaze-analysis';
import type { GazeFeature, PredictionResult, TestMode } from '../types';
import { FullscreenGazeReplay, FullscreenRawGazeReplay } from './fullscreen-gaze-replay';

interface ResultsDisplayProps {
  result: PredictionResult;
  mode: TestMode;
  onNewTest: () => void;
  readingContent?: string;
  visualizations?: AttemptVisualization[];
  rawGazeData?: RawReadingGazePoint[];
  rawGazeCoordinateSpace?: 'screen-pixels' | 'normalized';
  taskScreenshot?: string | null;
}

type ReplayMode = 'raw' | 'model' | null;

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: 'Low likelihood',
    color: 'text-[#51513d]',
    ringColor: '#a6a867',
    description: 'The reading pattern had fewer dyslexia-associated signals.',
    recommendation: 'Keep reading practice consistent and re-screen later to watch progress.',
  },
  medium: {
    icon: ShieldAlert,
    label: 'Some indicators',
    color: 'text-[#8b6f25]',
    ringColor: '#e3dc95',
    description: 'Lexora saw several patterns that may deserve closer attention.',
    recommendation: 'Share this result with a teacher or reading specialist if concerns persist.',
  },
  high: {
    icon: Shield,
    label: 'Strong indicators',
    color: 'text-red-600',
    ringColor: '#ef4444',
    description: 'The reading pattern showed stronger dyslexia-associated signals.',
    recommendation: 'A professional literacy evaluation is recommended for next steps.',
  },
} as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mapToElement(raw: number, min: number, max: number): number {
  return clamp01((raw - min) / (max - min));
}

function downsample<T>(items: T[], maxItems: number): T[] {
  if (items.length <= maxItems) return items;
  const step = Math.ceil(items.length / maxItems);
  return items.filter((_, index) => index % step === 0);
}

export function ResultsDisplay({
  result,
  mode,
  onNewTest,
  readingContent,
  visualizations,
  rawGazeData = [],
  rawGazeCoordinateSpace = 'screen-pixels',
  taskScreenshot,
}: ResultsDisplayProps) {
  const config = RISK_CONFIG[result.riskLevel];
  const Icon = config.icon;
  const [replayMode, setReplayMode] = useState<ReplayMode>(null);
  const probability = Math.round(result.dyslexiaProbability * 100);
  const confidence = Math.round(result.confidence * 100);

  const modelFeatures = useMemo<GazeFeature[]>(
    () => visualizations?.[0]?.features ?? result.features ?? [],
    [result.features, visualizations],
  );
  const rawAnalysis = useMemo(
    () => calculateReadingAnalysis(readingContent, rawGazeData),
    [rawGazeData, readingContent],
  );
  const modelAnalysis = useMemo(() => calculateDerivedGazeAnalysis(modelFeatures), [modelFeatures]);
  const hasRawReplay = Boolean(readingContent && rawGazeData.length > 1);
  const hasTobiiReplay = Boolean(visualizations?.length);
  const hasModelReplay = Boolean(modelFeatures.length && (readingContent || hasTobiiReplay));

  const handleCloseReplay = useCallback(() => setReplayMode(null), []);

  if (replayMode === 'raw' && hasRawReplay) {
    return (
      <FullscreenRawGazeReplay
        taskType={mode === 'webcam' ? 'paragraph' : 'meaningful-text'}
        content={readingContent!}
        points={rawGazeData}
        coordinateSpace={rawGazeCoordinateSpace}
        title="Raw gaze replay"
        onClose={handleCloseReplay}
      />
    );
  }

  if (replayMode === 'model' && hasModelReplay) {
    if (hasTobiiReplay && visualizations) {
      return (
        <AttemptVisualizationOverlay visualizations={visualizations} onClose={handleCloseReplay} />
      );
    }

    return (
      <FullscreenGazeReplay
        taskType="paragraph"
        content={readingContent!}
        features={modelFeatures}
        onClose={handleCloseReplay}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#e3dcc2] text-[#1b2021]"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      <div className="z-10 shrink-0 border-b border-[#51513d]/18 bg-[#f3edd7]">
        <div className="flex items-center justify-between px-6 py-4">
          <LexoraLogo size="sm" />
          <span className="text-xs font-black tracking-[0.2em] text-[#51513d] uppercase">
            Screening Results
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
          <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[12px_12px_0_rgba(81,81,61,.08)] md:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative h-36 w-36 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="rgba(81,81,61,0.12)"
                      strokeWidth="9"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke={config.ringColor}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${58 * 2 * Math.PI}`}
                      strokeDashoffset={`${58 * 2 * Math.PI * (1 - result.dyslexiaProbability)}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('font-mono text-4xl font-black', config.color)}>
                      {probability}%
                    </span>
                    <span className="text-[10px] font-black tracking-widest text-[#51513d]/70 uppercase">
                      likelihood
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', config.color)} />
                    <p
                      className={cn('text-sm font-black tracking-[0.2em] uppercase', config.color)}
                    >
                      {config.label}
                    </p>
                  </div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                    Reading pattern summary
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#51513d]">
                    {config.description} {config.recommendation}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <MetricTile label="Confidence" value={`${confidence}%`} />
                    <MetricTile label="Model fixations" value={modelAnalysis.fixationCount} />
                    <MetricTile
                      label="Model regressions"
                      value={modelAnalysis.regressionCount}
                      tone={modelAnalysis.regressionCount > 6 ? 'warn' : 'default'}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <InsightCard
                icon={Timer}
                label="Raw reading speed"
                value={rawAnalysis ? `${rawAnalysis.readingWpm} WPM` : 'Not available'}
                body="Estimated from the raw samples captured while the reader was on the paragraph."
              />
              <InsightCard
                icon={Target}
                label="Average focus"
                value={
                  rawAnalysis
                    ? `${rawAnalysis.avgFixationMs} ms`
                    : `${modelAnalysis.avgFixationMs} ms`
                }
                body="Longer pauses can mean careful decoding, uncertainty, or rereading."
              />
              <InsightCard
                icon={Activity}
                label="Backtracks"
                value={rawAnalysis?.regressionCount ?? modelAnalysis.regressionCount}
                body="Backward jumps on the same line are counted as rereads/regressions."
              />
              <InsightCard
                icon={Brain}
                label="Reading signal"
                value={result.metadata.sequencesAnalyzed}
                body="Lexora looks at fixation timing, movement length, regressions, and reading rhythm."
              />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6">
              <p className="text-xs font-black tracking-[0.2em] text-[#51513d] uppercase">
                What Lexora looked at
              </p>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#51513d]">
                <p>
                  The model does not diagnose from one number. It compares several eye-movement
                  patterns: how long the reader pauses, how far the eyes jump between pauses, how
                  often the gaze moves backward, and how smoothly each line transitions to the next.
                </p>
                <p>
                  A few regressions are normal. Many short backtracks, long fixation times, or an
                  uneven scan pattern can raise the screening score because those patterns often
                  appear when reading demands extra effort.
                </p>
              </div>
              <div className="mt-5 flex items-start gap-3 border border-[#e3dc95] bg-[#e3dc95]/25 p-4 text-xs leading-relaxed text-[#51513d]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Lexora is a screening aid, not a medical diagnosis. Use it as a clear report to
                  discuss with educators or specialists.
                </span>
              </div>
            </div>

            <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-[#51513d] uppercase">
                    Visualize the reading
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Raw vs model view</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ReplayChoice
                  title="Raw child vision"
                  body="Shows the points captured directly during reading before model grouping."
                  disabled={!hasRawReplay}
                  onClick={() => setReplayMode('raw')}
                />
                <ReplayChoice
                  title="Model interpretation"
                  body="Shows model-derived fixations, regressions, return sweeps, and pause length."
                  disabled={!hasModelReplay}
                  onClick={() => setReplayMode('model')}
                />
              </div>
            </div>
          </section>

          <ScreenshotComparison
            screenshot={taskScreenshot}
            rawPoints={rawGazeData}
            rawCoordinateSpace={rawGazeCoordinateSpace}
            modelFeatures={modelFeatures}
          />

          <section className="flex flex-col gap-3 border border-[#51513d]/18 bg-[#f3edd7] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#51513d]">
              <span className="font-black text-[#1b2021]">Next step:</span> {config.recommendation}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onNewTest}
                className="inline-flex items-center justify-center border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-3 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                New Test
              </button>
              <Link
                href="/history"
                className="inline-flex items-center justify-center bg-[#51513d] px-5 py-3 text-xs font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
              >
                History
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className="border border-[#51513d]/14 bg-[#e3dcc2]/45 p-3">
      <p className="text-[10px] font-black tracking-widest text-[#51513d]/70 uppercase">{label}</p>
      <p className={cn('mt-1 font-mono text-xl font-black', tone === 'warn' && 'text-[#8b6f25]')}>
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  body,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  body: string;
}) {
  return (
    <div className="border border-[#51513d]/18 bg-[#f3edd7] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-[#a6a867]/25 text-[#51513d]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black tracking-widest text-[#51513d]/70 uppercase">
            {label}
          </p>
          <p className="font-mono text-2xl font-black text-[#1b2021]">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[#51513d]">{body}</p>
    </div>
  );
}

function ReplayChoice({
  title,
  body,
  disabled,
  onClick,
}: {
  title: string;
  body: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-36 border border-[#51513d]/18 bg-[#e3dcc2]/45 p-5 text-left transition-colors hover:bg-[#e3dcc2] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <div className="flex items-center gap-2 text-[#51513d]">
        <Play className="h-4 w-4" />
        <span className="text-[10px] font-black tracking-widest uppercase">Open replay</span>
      </div>
      <h3 className="mt-4 text-lg font-black tracking-tight text-[#1b2021]">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[#51513d]">{body}</p>
    </button>
  );
}

function ScreenshotComparison({
  screenshot,
  rawPoints,
  rawCoordinateSpace,
  modelFeatures,
}: {
  screenshot?: string | null;
  rawPoints: RawReadingGazePoint[];
  rawCoordinateSpace: 'screen-pixels' | 'normalized';
  modelFeatures: GazeFeature[];
}) {
  return (
    <section className="border border-[#51513d]/18 bg-[#f3edd7] p-6">
      <p className="text-xs font-black tracking-[0.2em] text-[#51513d] uppercase">
        Captured paragraph image
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight">Same page, two overlays</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#51513d]">
        These previews use the screenshot captured during the test. Raw gaze shows direct samples;
        model gaze shows the fixation features returned by the analysis service.
      </p>

      {screenshot ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ScreenshotOverlay
            title="Raw gaze"
            screenshot={screenshot}
            rawPoints={rawPoints}
            rawCoordinateSpace={rawCoordinateSpace}
          />
          <ScreenshotOverlay
            title="Model-derived gaze"
            screenshot={screenshot}
            modelFeatures={modelFeatures}
          />
        </div>
      ) : (
        <div className="mt-5 border border-[#51513d]/14 bg-[#e3dcc2]/45 p-5 text-sm text-[#51513d]">
          Captured image unavailable for this attempt. Fullscreen replays still use the live reading
          layout as a mirror.
        </div>
      )}
    </section>
  );
}

function ScreenshotOverlay({
  title,
  screenshot,
  rawPoints,
  rawCoordinateSpace = 'screen-pixels',
  modelFeatures,
}: {
  title: string;
  screenshot: string;
  rawPoints?: RawReadingGazePoint[];
  rawCoordinateSpace?: 'screen-pixels' | 'normalized';
  modelFeatures?: GazeFeature[];
}) {
  const rawSample = useMemo(() => downsample(sanitizeRawGaze(rawPoints ?? []), 72), [rawPoints]);
  const modelSample = useMemo(() => downsample(modelFeatures ?? [], 72), [modelFeatures]);
  const screenW = typeof window !== 'undefined' ? window.screen.width || 1920 : 1920;
  const screenH = typeof window !== 'undefined' ? window.screen.height || 1080 : 1080;

  return (
    <div className="overflow-hidden border border-[#51513d]/18 bg-[#e3dcc2]/45">
      <div className="flex items-center justify-between border-b border-[#51513d]/14 px-4 py-3">
        <p className="text-xs font-black tracking-widest text-[#51513d] uppercase">{title}</p>
        <p className="font-mono text-[10px] text-[#51513d]/65">
          {(rawPoints?.length ?? modelFeatures?.length ?? 0).toLocaleString()} points
        </p>
      </div>
      <div className="relative aspect-video bg-[#1b2021]">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL captured from current DOM */}
        <img src={screenshot} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {rawSample.slice(1).map((point, index) => {
            const previous = rawSample[index];
            const from = rawPercent(previous, rawCoordinateSpace, screenW, screenH);
            const to = rawPercent(point, rawCoordinateSpace, screenW, screenH);
            return (
              <line
                key={`${previous.timestamp}-${point.timestamp}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#1f6f6b"
                strokeWidth="0.28"
                opacity="0.45"
              />
            );
          })}
          {modelSample.slice(1).map((feature, index) => {
            const previous = modelSample[index];
            const from = modelPercent(previous);
            const to = modelPercent(feature);
            return (
              <line
                key={`${previous.timestamp}-${feature.timestamp}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={feature.isRegression ? '#f87171' : '#a6a867'}
                strokeWidth="0.24"
                opacity="0.5"
              />
            );
          })}
          {rawSample.map((point) => {
            const position = rawPercent(point, rawCoordinateSpace, screenW, screenH);
            return (
              <circle
                key={point.timestamp}
                cx={position.x}
                cy={position.y}
                r="0.8"
                fill="#1f6f6b"
                opacity="0.34"
              />
            );
          })}
          {modelSample.map((feature) => {
            const position = modelPercent(feature);
            return (
              <circle
                key={feature.timestamp}
                cx={position.x}
                cy={position.y}
                r={feature.isRegression ? '1.2' : '0.95'}
                fill={feature.isRegression ? '#f87171' : '#51513d'}
                opacity="0.38"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function rawPercent(
  point: RawReadingGazePoint,
  coordinateSpace: 'screen-pixels' | 'normalized',
  screenW: number,
  screenH: number,
) {
  if (coordinateSpace === 'normalized') {
    return { x: clamp01(point.x) * 100, y: clamp01(point.y) * 100 };
  }
  return { x: clamp01(point.x / screenW) * 100, y: clamp01(point.y / screenH) * 100 };
}

function modelPercent(feature: GazeFeature) {
  const readingW = 1 - READING_ZONE_BOUNDS.left - READING_ZONE_BOUNDS.right;
  const readingH = 1 - READING_ZONE_BOUNDS.top - READING_ZONE_BOUNDS.bottom;

  return {
    x:
      (READING_ZONE_BOUNDS.left +
        mapToElement(feature.fixationX, AOI_X_BOUNDS.min, AOI_X_BOUNDS.max) * readingW) *
      100,
    y:
      (READING_ZONE_BOUNDS.top +
        mapToElement(feature.fixationY, AOI_Y_BOUNDS.min, AOI_Y_BOUNDS.max) * readingH) *
      100,
  };
}
