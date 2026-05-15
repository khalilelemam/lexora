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
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';
import type { PredictionResult, TestMode } from '../types';
import { FullscreenGazeReplay } from './fullscreen-gaze-replay';

interface ResultsDisplayProps {
  result: PredictionResult;
  mode: TestMode;
  onNewTest: () => void;
  readingContent?: string;
}

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: 'Low Risk',
    color: 'text-[#51513d]',
    ringColor: '#a6a867',
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
    color: 'text-[#8b6f25]',
    ringColor: '#e3dc95',
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

export function ResultsDisplay({ result, mode, onNewTest, readingContent }: ResultsDisplayProps) {
  const config = RISK_CONFIG[result.riskLevel];
  const Icon = config.icon;
  const [showTechnical, setShowTechnical] = useState(false);
  const [showGazeReplay, setShowGazeReplay] = useState(false);
  const probability = Math.round(result.dyslexiaProbability * 100);
  const hasReplay = result.features && result.features.length > 0 && readingContent;

  const handleCloseReplay = useCallback(() => setShowGazeReplay(false), []);

  // ── Fullscreen gaze replay overlay ──
  if (showGazeReplay && hasReplay) {
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
      className="fixed inset-0 flex flex-col bg-[#e3dcc2] text-[#1b2021]"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Top bar */}
      <div className="z-10 shrink-0 border-b border-[#51513d]/18 bg-[#f3edd7]">
        <div className="flex items-center justify-between px-6 py-4">
          <LexoraLogo size="sm" />
          <span className="text-xs font-black tracking-[0.2em] text-[#51513d] uppercase">
            Screening Results
          </span>
        </div>
      </div>

      {/* Main content — horizontal split */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* LEFT — Risk result + recommendations */}
        <div className="shrink-0 overflow-y-auto border-b border-[#51513d]/18 bg-[#e3dcc2]/50 lg:w-105 lg:border-r lg:border-b-0 xl:w-115">
          <div className="flex flex-col gap-8 p-6 lg:p-8">
            {/* Score gauge */}
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(81,81,61,0.15)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={config.ringColor}
                    strokeWidth="6"
                    strokeLinecap="butt"
                    strokeDasharray={`${42 * 2 * Math.PI}`}
                    strokeDashoffset={`${42 * 2 * Math.PI * (1 - result.dyslexiaProbability)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('font-mono text-2xl font-black', config.color)}>
                    {probability}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-5 w-5', config.color)} />
                  <h2 className={cn('text-xl font-black tracking-tight', config.color)}>
                    {config.label}
                  </h2>
                </div>
                <p className="text-xs leading-relaxed text-[#1b2021]/70">{config.description}</p>
              </div>
            </div>

            <div className="border-t border-[#51513d]/18" />

            {/* Next steps */}
            <div>
              <h3 className="mb-1 text-xs font-black tracking-[0.15em] text-[#51513d] uppercase">
                What should you do?
              </h3>
              <p className="mb-5 text-xs leading-relaxed text-[#1b2021]/70">
                {config.recommendation}
              </p>
              <div className="grid gap-px overflow-hidden border border-[#51513d]/18 bg-[#51513d]/18">
                {config.nextSteps.map((step, idx) => (
                  <div key={idx} className="grid grid-cols-[3rem_1fr] bg-[#f3edd7]">
                    <div className="bg-[#a6a867] p-3 font-mono text-[11px] font-black text-[#1b2021]">
                      0{idx + 1}
                    </div>
                    <div className="flex items-center p-3 text-[13px] font-black text-[#1b2021]">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimers */}
            <div className="space-y-3">
              {mode === 'webcam' && (
                <div className="flex items-start gap-3 border border-[#e3dc95] bg-[#e3dc95]/25 p-4 text-xs leading-relaxed text-[#51513d]">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Webcam tracking is less accurate than professional hardware.</span>
                </div>
              )}
              <div className="flex items-start gap-3 border border-[#51513d]/18 bg-[#e3dc95]/30 p-4 text-xs leading-relaxed text-[#51513d]">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  This is a screening tool, not a medical diagnosis. Consult a specialist.
                </span>
              </div>
            </div>

            {/* Technical details */}
            <div>
              <button
                type="button"
                onClick={() => setShowTechnical(!showTechnical)}
                className="flex w-full items-center justify-between border-y border-[#51513d]/18 py-4 text-xs font-black tracking-[0.15em] text-[#51513d] uppercase transition-colors hover:bg-[#51513d]/5"
              >
                <span>Technical details</span>
                {showTechnical ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showTechnical && (
                <div className="border-b border-[#51513d]/18 bg-[#f3edd7] p-4 text-[11px]">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Probability', value: `${probability}%` },
                      { label: 'Confidence', value: `${Math.round(result.confidence * 100)}%` },
                      {
                        label: 'Fixations',
                        value: result.metadata.totalFixations.toLocaleString(),
                      },
                      {
                        label: 'Sequences',
                        value: result.metadata.sequencesAnalyzed.toLocaleString(),
                      },
                      { label: 'Mode', value: mode === 'tobii' ? 'Tobii' : 'Webcam' },
                      { label: 'Date', value: new Date().toLocaleDateString() },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="block font-black tracking-[0.1em] text-[#51513d] uppercase">
                          {label}
                        </span>
                        <span className="font-mono text-[#1b2021]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onNewTest}
                className="inline-flex flex-1 items-center justify-center border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-3.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                New Test
              </button>
              <button
                type="button"
                onClick={onNewTest}
                className="inline-flex flex-1 items-center justify-center bg-[#51513d] px-5 py-3.5 text-xs font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
              >
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Gaze replay CTA */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full flex-col items-center justify-center p-6 lg:p-8">
            {hasReplay ? (
              <div className="flex max-w-sm flex-col items-center gap-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center border border-[#51513d]/18 bg-[#a6a867]/20 shadow-[10px_10px_0_rgba(81,81,61,.08)]">
                  <Eye className="h-10 w-10 text-[#51513d]" />
                </div>
                <div>
                  <h3 className="mb-3 text-2xl font-black tracking-tight text-[#1b2021]">
                    Eye Movement Replay
                  </h3>
                  <p className="text-sm leading-relaxed text-[#1b2021]/70">
                    Watch how the reader&apos;s eyes moved across the text with ML-analyzed fixation
                    data. Larger bubbles indicate longer pauses.
                    <span className="font-black text-red-500"> Red</span> = regressions.
                  </p>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-[#51513d]/60">
                  <p>{result.metadata.totalFixations} fixations analyzed</p>
                  <p>{result.metadata.sequencesAnalyzed} reading sequences</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGazeReplay(true)}
                  className="inline-flex items-center bg-[#51513d] px-8 py-4 text-sm font-black text-[#e3dcc2] shadow-[8px_8px_0_rgba(27,32,33,.15)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_rgba(27,32,33,.15)]"
                >
                  <Play className="mr-2 h-4 w-4" />
                  View Gaze Replay
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-[#51513d]/40">
                <Eye className="mb-4 h-12 w-12" />
                <p className="font-black tracking-[0.1em] uppercase">No gaze replay data</p>
                <p className="mt-2 text-xs">
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
