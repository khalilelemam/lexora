'use client';

import { ShieldCheck, ShieldAlert, Shield, BarChart3, Activity, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PredictionResult, TestMode } from '../types';
import { GazeReplayViewer } from './gaze-replay-viewer';

interface ResultsDisplayProps {
  result: PredictionResult;
  mode: TestMode;
  onNewTest: () => void;
  /** The reading content displayed during test (needed for gaze replay) */
  readingContent?: string;
}

const RISK_CONFIG = {
  low: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeVariant: 'default' as const,
    icon: ShieldCheck,
    label: 'Low Risk',
    description: 'The screening suggests a low likelihood of dyslexia indicators.',
    recommendation:
      'Continue monitoring reading progress. Consider re-screening in 6-12 months to track development.',
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    badgeVariant: 'secondary' as const,
    icon: ShieldAlert,
    label: 'Medium Risk',
    description: 'The screening shows some indicators that may be associated with dyslexia.',
    recommendation:
      'Consider scheduling a professional evaluation with a learning specialist. Practice with reading exercises and learning activities in the meantime.',
  },
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeVariant: 'destructive' as const,
    icon: Shield,
    label: 'High Risk',
    description: 'The screening indicates significant markers commonly associated with dyslexia.',
    recommendation:
      'A professional evaluation with a certified learning specialist is strongly recommended. Early intervention can make a significant difference.',
  },
};

export function ResultsDisplay({ result, mode, onNewTest, readingContent }: ResultsDisplayProps) {
  const config = RISK_CONFIG[result.riskLevel];
  const Icon = config.icon;
  const probabilityPercent = Math.round(result.dyslexiaProbability * 100);
  const confidencePercent = Math.round(result.confidence * 100);
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      {/* Risk Level Header */}
      <div className={cn('flex w-full flex-col items-center gap-4 rounded-lg border p-6', config.bgColor, config.borderColor)}>
        <Icon className={cn('h-14 w-14', config.color)} />
        <div className="text-center">
          <Badge variant={config.badgeVariant} className="mb-2 text-sm">
            {config.label}
          </Badge>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Dyslexia Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{probabilityPercent}%</div>
              <Progress value={probabilityPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              Model Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{confidencePercent}%</div>
              <Progress value={confidencePercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Info */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Test Mode</span>
              <p className="font-medium">
                {mode === 'tobii' ? 'Eye Tracker (Tobii)' : 'Webcam'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Fixations Analyzed</span>
              <p className="font-medium">{result.metadata.totalFixations.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sequences Analyzed</span>
              <p className="font-medium">{result.metadata.sequencesAnalyzed.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Gaze Replay Visualization */}
      {result.features && result.features.length > 0 && readingContent && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Eye Movement Replay</CardTitle>
          </CardHeader>
          <CardContent>
            <GazeReplayViewer
              content={readingContent}
              features={result.features}
              direction="ltr"
            />
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{config.recommendation}</p>
        </CardContent>
      </Card>

      {/* Webcam accuracy disclaimer */}
      {mode === 'webcam' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Webcam-based screening is less accurate than professional eye-tracking hardware. For a
            more reliable assessment, consider using a Tobii eye tracker.
          </AlertDescription>
        </Alert>
      )}

      {/* Important disclaimer */}
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription>
          This is a screening tool, not a medical diagnosis. Results should be interpreted by a
          qualified professional. Please consult a learning specialist for a comprehensive evaluation.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onNewTest}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Take Another Test
        </Button>
      </div>
    </div>
  );
}
