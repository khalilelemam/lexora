'use client';

import { useMemo, useState } from 'react';
import { Activity, CalendarClock, Eye, Gauge, Info, Loader2, User } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { GazeReplayViewer } from '@/features/test/components/gaze-replay-viewer';
import { useAdminAttempt, useMyAttempt } from '@/features/attempts/hooks/use-attempts';
import type { AttemptDetail, AttemptListItem } from '@/features/attempts/types';
import {
  formatAttemptDate,
  OUTCOME_LABELS,
  TEST_TYPE_LABELS,
} from '@/features/attempts/lib/attempt-labels';
import type { TaskType } from '@/features/test/types';

import { OutcomeBadge } from './attempt-badges';

interface AttemptListProps {
  attempts: AttemptListItem[];
  scope: 'user' | 'admin';
}

const OUTCOME_COPY = {
  low: 'The screening suggests a low likelihood of dyslexia indicators.',
  medium: 'The screening shows some indicators that may be associated with dyslexia.',
  high: 'The screening shows strong indicators associated with dyslexia.',
} as const;

export function AttemptList({ attempts, scope }: AttemptListProps) {
  const [openAttemptId, setOpenAttemptId] = useState<string>();

  if (attempts.length === 0) {
    return (
      <div className="border-border bg-card flex min-h-64 flex-col items-center justify-center rounded-lg border p-8 text-center">
        <Gauge className="text-muted-foreground mb-3 h-8 w-8" />
        <h2 className="text-lg font-semibold">No attempts found</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          Try clearing filters, or complete a screening test to create a saved attempt.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible value={openAttemptId} onValueChange={setOpenAttemptId}>
      <div className="grid gap-3">
        {attempts.map((attempt) => (
          <AttemptCard
            key={attempt.attemptId}
            attempt={attempt}
            scope={scope}
            expanded={openAttemptId === attempt.attemptId}
          />
        ))}
      </div>
    </Accordion>
  );
}

function AttemptCard({
  attempt,
  scope,
  expanded,
}: {
  attempt: AttemptListItem;
  scope: 'user' | 'admin';
  expanded: boolean;
}) {
  const myAttemptQuery = useMyAttempt(attempt.attemptId, scope === 'user' && expanded);
  const adminAttemptQuery = useAdminAttempt(attempt.attemptId, scope === 'admin' && expanded);
  const detailQuery = scope === 'admin' ? adminAttemptQuery : myAttemptQuery;

  return (
    <AccordionItem
      value={attempt.attemptId}
      className="border-border bg-card rounded-lg border px-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <AccordionTrigger className="py-4 hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <OutcomeBadge outcome={attempt.outcome} />
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {TEST_TYPE_LABELS[attempt.testType]}
            </span>
          </div>

          <div className="grid gap-2">
            <h2 className="truncate text-base font-semibold">
              {attempt.label || `${TEST_TYPE_LABELS[attempt.testType]} screening`}
            </h2>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatAttemptDate(attempt.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Age {attempt.age}
              </span>
              {scope === 'admin' && attempt.user && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {attempt.user.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pb-4">
        {detailQuery.isPending ? (
          <AttemptDetailSkeleton />
        ) : detailQuery.isError ? (
          <div className="border-destructive/20 bg-destructive/5 rounded-md border p-4 text-sm">
            Could not load the saved result for this attempt.
          </div>
        ) : (
          <AttemptSummary detail={detailQuery.data.attempt} scope={scope} />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function AttemptSummary({ detail, scope }: { detail: AttemptDetail; scope: 'user' | 'admin' }) {
  const [visualizationOpen, setVisualizationOpen] = useState(false);
  const replay = useReplayInput(detail);

  return (
    <div className="grid gap-4 border-t pt-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{OUTCOME_LABELS[detail.outcome]}</h3>
          <p className="text-muted-foreground max-w-2xl text-sm">{OUTCOME_COPY[detail.outcome]}</p>
        </div>

        {replay ? (
          <Button size="sm" onClick={() => setVisualizationOpen(true)}>
            <Eye className="h-4 w-4" />
            Visualization
          </Button>
        ) : (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Info className="h-3.5 w-3.5" />
            No replay data
          </div>
        )}
      </div>

      {scope === 'admin' && (
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <AdminMetric label="Model" value={detail.modelVersion} />
          <AdminMetric label="Fixations" value={detail.result.metadata.totalFixations.toLocaleString()} />
          <AdminMetric
            label="Sequences"
            value={detail.result.metadata.sequencesAnalyzed.toLocaleString()}
          />
        </div>
      )}

      <Dialog open={visualizationOpen} onOpenChange={setVisualizationOpen}>
        <DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:rounded-none">
          <DialogHeader>
            <DialogTitle>Gaze Visualization</DialogTitle>
            <DialogDescription>
              Replay of the primary reading task stored with this attempt.
            </DialogDescription>
          </DialogHeader>
          {replay && <GazeReplayViewer content={replay.content} features={detail.result.features!} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function useReplayInput(detail: AttemptDetail) {
  return useMemo(() => {
    const features = detail.result.features;
    const snapshot = detail.contentSnapshot;

    if (!features?.length || !snapshot) {
      return null;
    }

    const primaryTask = snapshot.primaryTask as TaskType;
    const content = snapshot.tasks[primaryTask];

    return content ? { content } : null;
  }, [detail]);
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function AttemptDetailSkeleton() {
  return (
    <div className="grid gap-4 border-t pt-4">
      <div className="flex items-center justify-between gap-4">
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading
        </div>
      </div>
    </div>
  );
}
