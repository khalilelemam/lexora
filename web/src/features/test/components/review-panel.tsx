'use client';

import { CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TASK_LABELS } from '../lib/test-content';
import { MIN_GAZE_POINTS } from '../lib/constants';

interface ReviewPanelProps {
  taskType: string;
  pointCount: number;
  /** Whether this is the last task (changes "Continue" label) */
  isLastTask: boolean;
  onRetake: () => void;
  onContinue: () => void;
}

export function ReviewPanel({
  taskType,
  pointCount,
  isLastTask,
  onRetake,
  onContinue,
}: ReviewPanelProps) {
  const hasEnoughData = pointCount >= MIN_GAZE_POINTS;

  return (
    <div className="flex flex-col items-center gap-6">
      <CheckCircle2 className="h-12 w-12 text-green-600" />

      <div className="text-center">
        <h2 className="text-2xl font-semibold">Task Complete</h2>
        <p className="mt-1 text-muted-foreground">
          {TASK_LABELS[taskType] ?? taskType} reading finished.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gaze points collected</span>
            <span className="font-medium">{pointCount.toLocaleString()}</span>
          </div>
          {!hasEnoughData && (
            <p className="mt-2 text-sm text-destructive">
              Warning: Only {pointCount} points collected (minimum {MIN_GAZE_POINTS}).
              Consider retaking this task.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetake}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retake
        </Button>
        <Button onClick={onContinue}>
          {isLastTask ? 'Submit for Analysis' : 'Next Task'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
