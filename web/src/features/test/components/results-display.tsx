'use client';

import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  RotateCcw,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Play,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';
import type { PredictionResult, TestMode, CalibrationQuality } from '../types';
import type { AttemptVisualization } from '@/features/attempts/types';
import { FullscreenGazeReplay } from './fullscreen-gaze-replay';
import { AttemptVisualizationOverlay } from '@/features/attempts/components/attempt-visualization-overlay';

interface ResultsDisplayProps {
  result: PredictionResult;
  mode: TestMode;
  onNewTest: () => void;
  /** Single reading content — used for webcam gaze replay */
  readingContent?: string;
  /** Calibration validation quality - used for the data quality badge */
  calibrationQuality?: CalibrationQuality;
  /** Multi-task visualizations - used for Tobii gaze replay with task switching */
  visualizations?: AttemptVisualization[];
}

const DATA_QUALITY_CONFIG = {
  good: {
    label: 'High Quality',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/60',
    description: 'Calibration was precise — results are highly reliable.',
  },
  acceptable: {
    label: 'Moderate Quality',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200/60',
    description: 'Calibration was adequate — results may have minor inaccuracies.',
  },
  poor: {
    label: 'Low Quality',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200/60',
    description: 'Calibration was imprecise — consider re-testing for more accurate results.',
  },
} as const;

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: 'Low Risk',
    color: 'text-emerald-600',
    ringColor: '#10b981',
    description: 'The screening suggests a low likelihood of dyslexia indicators.',
    recommendation:
      'Continue monitoring reading progress. Consider re-screening in 6–12 months to track development.',
    nextSteps: [
      'Keep reading together regularly',
      'Revisit Lexora in 6–12 months',
      'No immediate action required',
    ],
  },
  medium: {
    icon: ShieldAlert,
    label: 'Possible Indicators',
    color: 'text-amber-600',
    ringColor: '#f59e0b',
    description: 'The screening shows some indicators that may be associated with dyslexia.',
    recommendation: 'Consider scheduling a professional evaluation with a learning specialist.',
    nextSteps: [
      'Schedule a professional evaluation',
      'Practice with structured reading exercises',
      "Speak with the child's teacher about extra support",
    ],
  },
  high: {
    icon: Shield,
    label: 'High Risk',
    color: 'text-red-600',
    ringColor: '#ef4444',
    description: 'The screening shows strong indicators associated with dyslexia.',
    recommendation:
      'A professional evaluation is strongly recommended to confirm and guide intervention.',
    nextSteps: [
      'Schedule a professional evaluation as soon as possible',
      'Discuss accommodations with the school',
      'Research evidence-based dyslexia interventions',
    ],
  },
} as const;

export function ResultsDisplay({
  result,
  mode,
  onNewTest,
  readingContent,
  calibrationQuality,
  visualizations,
}: ResultsDisplayProps) {
  const config = RISK_CONFIG[result.riskLevel];
  const Icon = config.icon;
  const [showTechnical, setShowTechnical] = useState(false);
  const [showGazeReplay, setShowGazeReplay] = useState(false);
  const probability = Math.round(result.dyslexiaProbability * 100);

  const hasWebcamReplay = result.features && result.features.length > 0 && readingContent;
  const hasTobiiReplay = visualizations && visualizations.length > 0;
  const hasReplay = hasTobiiReplay || hasWebcamReplay;

  const handleCloseReplay = useCallback(() => setShowGazeReplay(false), []);

  // ── Fullscreen gaze replay overlay ──
  if (showGazeReplay && hasReplay) {
    if (hasTobiiReplay) {
      return (
        <AttemptVisualizationOverlay visualizations={visualizations} onClose={handleCloseReplay} />
      );
    }

    return (
      <FullscreenGazeReplay
        taskType="paragraph"
        content={readingContent!}
        features={result.features!}
        onClose={handleCloseReplay}
      />
    );
  }

  // ── Default: Results page ──
  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#FDF8F0]"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Top bar */}
      <div className="z-10 shrink-0 border-b border-[#E8E0D4] bg-[#FDF8F0]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <LexoraLogo size="sm" />
          <span className="text-xs font-medium text-[#8B857E]">Screening Results</span>
        </div>
      </div>

      {/* Main content — horizontal split */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* LEFT — Risk result + recommendations */}
        <div className="shrink-0 overflow-y-auto border-b border-[#E8E0D4] bg-white/50 lg:w-105 lg:border-r lg:border-b-0 xl:w-115">
          <div className="flex flex-col gap-5 p-6 lg:p-8">
            {/* Score gauge */}
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(212,203,189,0.3)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={config.ringColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${42 * 2 * Math.PI}`}
                    strokeDashoffset={`${42 * 2 * Math.PI * (1 - result.dyslexiaProbability)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold tabular-nums', config.color)}>
                    {probability}%
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Icon className={cn('h-5 w-5', config.color)} />
                  <h2 className={cn('text-xl font-bold', config.color)}>{config.label}</h2>
                </div>
                <p className="text-sm leading-relaxed text-[#6B6560]">{config.description}</p>
              </div>
            </div>

            <div className="border-t border-[#E8E0D4]" />

            {/* Next steps */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#2D2A26]">What should you do?</h3>
              <p className="mb-4 text-sm leading-relaxed text-[#6B6560]">{config.recommendation}</p>
              <div className="space-y-2.5">
                {config.nextSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4A7C59] text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-[#6B6560]">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimers */}
            <div className="space-y-2.5">
              {mode === 'webcam' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200/50 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-700">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Webcam tracking is less accurate than professional hardware.</span>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-lg border border-[#4A7C59]/15 bg-[#4A7C59]/5 p-3 text-xs leading-relaxed text-[#4A7C59]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  This is a screening tool, not a medical diagnosis. Consult a specialist.
                </span>
              </div>
            </div>

            {/* Data quality badge — from calibration validation */}
            {calibrationQuality && (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed',
                  DATA_QUALITY_CONFIG[calibrationQuality].bg,
                  DATA_QUALITY_CONFIG[calibrationQuality].border,
                  DATA_QUALITY_CONFIG[calibrationQuality].color,
                )}
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <span className="font-semibold">
                    Data Quality: {DATA_QUALITY_CONFIG[calibrationQuality].label}
                  </span>
                  <span className="mt-0.5 block opacity-80">
                    {DATA_QUALITY_CONFIG[calibrationQuality].description}
                  </span>
                </div>
              </div>
            )}

            {/* Technical details */}
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="flex items-center gap-1.5 text-xs text-[#8B857E] transition-colors hover:text-[#6B6560]"
            >
              {showTechnical ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span>Technical details</span>
            </button>

            {showTechnical && (
              <div className="rounded-lg border border-[#E8E0D4] bg-[#F5F0E8]/50 p-3 text-xs text-[#8B857E]">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Probability', value: `${probability}%` },
                    { label: 'Confidence', value: `${Math.round(result.confidence * 100)}%` },
                    { label: 'Fixations', value: result.metadata.totalFixations.toLocaleString() },
                    {
                      label: 'Sequences',
                      value: result.metadata.sequencesAnalyzed.toLocaleString(),
                    },
                    { label: 'Mode', value: mode === 'tobii' ? 'Tobii' : 'Webcam' },
                    { label: 'Date', value: new Date().toLocaleDateString() },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className="block text-[11px] font-medium text-[#2D2A26]">{label}</span>
                      <span className="text-[#8B857E]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={onNewTest}
                className="flex-1 border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                New Test
              </Button>
              <Button
                onClick={onNewTest}
                className="flex-1 bg-[#4A7C59] text-white hover:bg-[#3D6A4B]"
              >
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT — Gaze replay CTA */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full flex-col items-center justify-center p-6 lg:p-8">
            {hasReplay ? (
              <div className="flex max-w-sm flex-col items-center gap-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4A7C59]/10">
                  <Eye className="h-8 w-8 text-[#4A7C59]" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-[#2D2A26]">Eye Movement Replay</h3>
                  <p className="text-sm leading-relaxed text-[#8B857E]">
                    Watch how the reader&apos;s eyes moved across the text with ML-analyzed fixation
                    data. Larger bubbles indicate longer pauses.
                    <span className="text-red-500"> Red</span> = regressions.
                  </p>
                </div>
                <div className="space-y-0.5 text-xs text-[#C4BDB4]">
                  <p>{result.metadata.totalFixations} fixations analyzed</p>
                  <p>{result.metadata.sequencesAnalyzed} reading sequences</p>
                </div>
                <Button
                  onClick={() => setShowGazeReplay(true)}
                  className="bg-[#4A7C59] px-8 text-white hover:bg-[#3D6A4B]"
                >
                  <Play className="mr-2 h-4 w-4" />
                  View Gaze Replay
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-[#C4BDB4]">
                <Eye className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No gaze replay data available</p>
                <p className="mt-1 text-xs">
                  The ML service did not return fixation features for this test.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
