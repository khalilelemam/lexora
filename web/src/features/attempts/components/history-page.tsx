'use client';

import { Activity, Camera, Monitor, RefreshCcw, Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyAttempts } from '@/features/attempts/hooks/use-attempts';
import type { AttemptFilters } from '@/features/attempts/types';

import { AttemptFiltersPanel } from './attempt-filters';
import { AttemptsWorkbenchShell } from './attempts-workbench-shell';
import { InfiniteScrollSentinel } from './infinite-scroll-sentinel';
import { AttemptList } from './attempt-list';

const DEFAULT_FILTERS: AttemptFilters = {
  limit: 12,
};

export function HistoryPage() {
  const [filters, setFilters] = useState<AttemptFilters>(DEFAULT_FILTERS);
  const attemptsQuery = useMyAttempts(filters);
  const attempts = useMemo(
    () => attemptsQuery.data?.pages.flatMap((page) => page.attempts) ?? [],
    [attemptsQuery.data],
  );
  const total = attemptsQuery.data?.pages[0]?.total;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = attemptsQuery;
  const activeFilterCount = getActiveFilterCount(filters);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <AttemptsWorkbenchShell
      activeSection="history"
      eyebrow="Personal signal log"
      title="Test History"
      description="Review saved screenings, compare outcomes, and reopen gaze visualizations without leaving your Lexora workspace."
      icon={Activity}
      actions={[
        { label: 'New Webcam Test', href: '/test/webcam', icon: Camera },
        { label: 'New Tobii Test', href: '/test/tobii', icon: Monitor, variant: 'outline' },
      ]}
      stats={[
        {
          label: 'Saved tests',
          value: typeof total === 'number' ? total.toLocaleString() : '...',
          detail: 'Matching current history view',
        },
        {
          label: 'Loaded',
          value: attempts.length.toLocaleString(),
          detail: hasNextPage ? 'More available below' : 'Visible in current session',
        },
        {
          label: 'Filters',
          value: activeFilterCount.toString(),
          detail: activeFilterCount ? 'Narrowing signal list' : 'Full history shown',
        },
      ]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <AttemptFiltersPanel filters={filters} onChange={setFilters} resultCount={total} />

        {attemptsQuery.isPending ? (
          <AttemptListSkeleton />
        ) : attemptsQuery.isError ? (
          <LoadError onRetry={() => attemptsQuery.refetch()} />
        ) : (
          <>
            <AttemptList attempts={attempts} scope="user" />
            <InfiniteScrollSentinel
              hasNextPage={Boolean(hasNextPage)}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>
    </AttemptsWorkbenchShell>
  );
}

function AttemptListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="border border-[#51513d]/18 bg-[#f3edd7]/86 p-4 shadow-[7px_7px_0_rgba(81,81,61,.08)]"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-64 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-destructive/24 border bg-[#f3edd7]/86 p-6 shadow-[8px_8px_0_rgba(81,81,61,.08)]">
      <div className="mb-3 inline-flex items-center gap-2 border border-[#51513d]/18 bg-[#e3dcc2]/70 px-3 py-2 text-[10px] font-black tracking-[0.2em] text-[#51513d] uppercase">
        <Sparkles className="h-3.5 w-3.5" />
        Sync stalled
      </div>
      <h2 className="font-black text-[#1b2021]">Could not load tests</h2>
      <p className="mt-1 text-sm text-[#1b2021]/70">Please try again.</p>
      <Button
        onClick={onRetry}
        variant="outline"
        size="sm"
        className="mt-4 border-[#51513d]/28 bg-[#e3dcc2]/70 font-bold text-[#1b2021] hover:bg-[#e3dc95]/55"
      >
        <RefreshCcw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function getActiveFilterCount(filters: AttemptFilters) {
  return [
    filters.query,
    filters.testType,
    filters.outcomes?.length ? filters.outcomes : undefined,
    filters.createdFrom || filters.createdTo,
  ].filter(Boolean).length;
}
