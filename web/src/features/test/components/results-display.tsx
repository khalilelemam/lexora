'use client';

import { ShieldCheck, ShieldAlert, Shield, RotateCcw, Eye, Info, ChevronDown, ChevronUp, ArrowRight, Play } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
    recommendation:
      'Consider scheduling a professional evaluation with a learning specialist.',
    nextSteps: [
      'Schedule a professional evaluation',
      'Practice with structured reading exercises',
      'Speak with the child\'s teacher about extra support',
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
    <div className="fixed inset-0 bg-[#FDF8F0] flex flex-col" style={{ animation: 'float-up 0.5s ease-out' }}>

      {/* Top bar */}
      <div className="shrink-0 border-b border-[#E8E0D4] bg-[#FDF8F0]/90 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <LexoraLogo size="sm" />
          <span className="text-[#8B857E] text-xs font-medium">Screening Results</span>
        </div>
      </div>

      {/* Main content — horizontal split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT — Risk result + recommendations */}
        <div className="lg:w-[420px] xl:w-[460px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E8E0D4] bg-white/50 overflow-y-auto">
          <div className="flex flex-col gap-5 p-6 lg:p-8">

            {/* Score gauge */}
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(212,203,189,0.3)" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={config.ringColor} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${42 * 2 * Math.PI}`}
                    strokeDashoffset={`${42 * 2 * Math.PI * (1 - result.dyslexiaProbability)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold tabular-nums', config.color)}>{probability}%</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('w-5 h-5', config.color)} />
                  <h2 className={cn('text-xl font-bold', config.color)}>{config.label}</h2>
                </div>
                <p className="text-[#6B6560] text-sm leading-relaxed">{config.description}</p>
              </div>
            </div>

            <div className="border-t border-[#E8E0D4]" />

            {/* Next steps */}
            <div>
              <h3 className="font-semibold text-[#2D2A26] text-sm mb-3">What should you do?</h3>
              <p className="text-[#6B6560] text-sm mb-4 leading-relaxed">{config.recommendation}</p>
              <div className="space-y-2.5">
                {config.nextSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="shrink-0 bg-[#4A7C59] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[#6B6560] text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimers */}
            <div className="space-y-2.5">
              {mode === 'webcam' && (
                <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-200/50 rounded-lg p-3 text-amber-700 text-xs leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Webcam tracking is less accurate than professional hardware.</span>
                </div>
              )}
              <div className="flex items-start gap-2 bg-[#4A7C59]/5 border border-[#4A7C59]/15 rounded-lg p-3 text-[#4A7C59] text-xs leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>This is a screening tool, not a medical diagnosis. Consult a specialist.</span>
              </div>
            </div>

            {/* Technical details */}
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="flex items-center gap-1.5 text-[#8B857E] text-xs hover:text-[#6B6560] transition-colors"
            >
              {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>Technical details</span>
            </button>

            {showTechnical && (
              <div className="bg-[#F5F0E8]/50 border border-[#E8E0D4] rounded-lg p-3 text-xs text-[#8B857E]">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Probability', value: `${probability}%` },
                    { label: 'Confidence', value: `${Math.round(result.confidence * 100)}%` },
                    { label: 'Fixations', value: result.metadata.totalFixations.toLocaleString() },
                    { label: 'Sequences', value: result.metadata.sequencesAnalyzed.toLocaleString() },
                    { label: 'Mode', value: mode === 'tobii' ? 'Tobii' : 'Webcam' },
                    { label: 'Date', value: new Date().toLocaleDateString() },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className="text-[#2D2A26] font-medium block text-[11px]">{label}</span>
                      <span className="text-[#8B857E]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={onNewTest} className="flex-1 border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]">
                <RotateCcw className="mr-2 h-4 w-4" />
                New Test
              </Button>
              <Button onClick={onNewTest} className="flex-1 bg-[#4A7C59] hover:bg-[#3D6A4B] text-white">
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT — Gaze replay CTA */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 h-full flex flex-col items-center justify-center">
            {hasReplay ? (
              <div className="flex flex-col items-center gap-5 text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#4A7C59]/10 flex items-center justify-center">
                  <Eye className="w-8 h-8 text-[#4A7C59]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2D2A26] text-lg mb-2">Eye Movement Replay</h3>
                  <p className="text-[#8B857E] text-sm leading-relaxed">
                    Watch how the reader&apos;s eyes moved across the text with ML-analyzed fixation data.
                    Larger bubbles indicate longer pauses.
                    <span className="text-red-500"> Red</span> = regressions.
                  </p>
                </div>
                <div className="text-xs text-[#C4BDB4] space-y-0.5">
                  <p>{result.metadata.totalFixations} fixations analyzed</p>
                  <p>{result.metadata.sequencesAnalyzed} reading sequences</p>
                </div>
                <Button onClick={() => setShowGazeReplay(true)} className="bg-[#4A7C59] hover:bg-[#3D6A4B] text-white px-8">
                  <Play className="mr-2 h-4 w-4" />
                  View Gaze Replay
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-[#C4BDB4]">
                <Eye className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No gaze replay data available</p>
                <p className="text-xs mt-1">The ML service did not return fixation features for this test.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
