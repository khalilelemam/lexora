'use client';

import { useCallback, useState } from 'react';
import { Activity, CalendarClock, Eye, Info, Loader2, User } from 'lucide-react';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAttempt, useMyAttempt } from '@/features/attempts/hooks/use-attempts';
import type { AttemptDetail, AttemptListItem } from '@/features/attempts/types';
import {
  formatAttemptDate,
  OUTCOME_LABELS,
  TEST_TYPE_LABELS,
} from '@/features/attempts/lib/attempt-labels';

import { AttemptVisualizationOverlay } from './attempt-visualization-overlay';
import { DeleteTestAction } from './delete-test-action';
import { OutcomeBadge } from './attempt-badges';

interface AttemptCardProps {
  attempt: AttemptListItem;
  scope: 'user' | 'admin';
  expanded: boolean;
}

const OUTCOME_COPY = {
  low: 'The screening suggests a low likelihood of dyslexia indicators.',
  medium: 'The screening shows some indicators that may be associated with dyslexia.',
  high: 'The screening shows strong indicators associated with dyslexia.',
} as const;

export function AttemptCard({ attempt, scope, expanded }: AttemptCardProps) {
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
            {attempt.deletedAt ? (
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/10 text-destructive"
              >
                Deleted
              </Badge>
            ) : null}
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {TEST_TYPE_LABELS[attempt.testType]}
            </span>
          </div>

          <div className="grid gap-2">
            <h2 className="truncate text-base font-semibold">{attempt.label}</h2>
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
            Could not load the saved result for this test.
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
  const [ownsFullscreen, setOwnsFullscreen] = useState(false);
  const hasReplay = detail.visualizations.length > 0;

  const openVisualization = useCallback(() => {
    setVisualizationOpen(true);

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement
        .requestFullscreen()
        .then(() => setOwnsFullscreen(true))
        .catch(() => setOwnsFullscreen(false));
    }
  }, []);

  const closeVisualization = useCallback(() => {
    setVisualizationOpen(false);

    if (ownsFullscreen && document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().finally(() => setOwnsFullscreen(false));
      return;
    }

    setOwnsFullscreen(false);
  }, [ownsFullscreen]);

  return (
    <div className="grid gap-4 border-t pt-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{OUTCOME_LABELS[detail.outcome]}</h3>
          <p className="text-muted-foreground max-w-2xl text-sm">{OUTCOME_COPY[detail.outcome]}</p>
          {detail.deletedAt ? (
            <p className="text-destructive text-sm">
              Deleted from the user&apos;s history on {formatAttemptDate(detail.deletedAt)}.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          {hasReplay ? (
            <Button size="sm" onClick={openVisualization}>
              <Eye className="h-4 w-4" />
              Visualization
            </Button>
          ) : (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              No replay data
            </div>
          )}

          {scope === 'user' && (
            <DeleteTestAction attemptId={detail.attemptId} label={detail.label} />
          )}
        </div>
      </div>

      {scope === 'admin' && (
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <AdminMetric label="Model" value={detail.modelVersion} />
          <AdminMetric
            label="Fixations"
            value={detail.result.metadata.totalFixations.toLocaleString()}
          />
          <AdminMetric
            label="Sequences"
            value={detail.result.metadata.sequencesAnalyzed.toLocaleString()}
          />
        </div>
      )}

      {visualizationOpen && hasReplay ? (
        <AttemptVisualizationOverlay
          visualizations={detail.visualizations}
          onClose={closeVisualization}
        />
      ) : null}
    </div>
  );
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
