'use client';

import { Download, History, RefreshCcw, Shield, Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAttempts } from '@/features/attempts/hooks/use-attempts';
import type { AttemptFilters } from '@/features/attempts/types';

import { AttemptFiltersPanel } from './attempt-filters';
import { AttemptsWorkbenchShell } from './attempts-workbench-shell';
import { ExportDialog } from './export-dialog';
import { InfiniteScrollSentinel } from './infinite-scroll-sentinel';
import { AttemptList } from './attempt-list';

const DEFAULT_FILTERS: AttemptFilters = {
  limit: 12,
};

export function AdminAttemptsPage() {
  const [filters, setFilters] = useState<AttemptFilters>(DEFAULT_FILTERS);
  const [exportOpen, setExportOpen] = useState(false);
  const attemptsQuery = useAdminAttempts(filters);
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
      activeSection="admin"
      eyebrow="Research operations"
      title="Admin Dashboard"
      description="Audit saved screenings across users, inspect replay artifacts, and export filtered datasets from one focused admin surface."
      icon={Shield}
      actions={[
        { label: 'Export Data', onClick: () => setExportOpen(true), icon: Download },
        { label: 'My History', href: '/history', icon: History, variant: 'outline' },
      ]}
      stats={[
        {
          label: 'Matched tests',
          value: typeof total === 'number' ? total.toLocaleString() : '...',
          detail: 'Across current admin filters',
        },
        {
          label: 'Loaded',
          value: attempts.length.toLocaleString(),
          detail: hasNextPage ? 'Scroll for next page' : 'Visible in current session',
        },
        {
          label: 'Filters',
          value: activeFilterCount.toString(),
          detail: activeFilterCount ? 'Applied to list and export' : 'Export covers all tests',
        },
      ]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} filters={filters} />
        <AttemptFiltersPanel filters={filters} onChange={setFilters} resultCount={total} />

        {attemptsQuery.isPending ? (
          <AttemptListSkeleton />
        ) : attemptsQuery.isError ? (
          <div className="border-destructive/24 border bg-[#f3edd7]/86 p-6 shadow-[8px_8px_0_rgba(81,81,61,.08)]">
            <div className="mb-3 inline-flex items-center gap-2 border border-[#51513d]/18 bg-[#e3dcc2]/70 px-3 py-2 text-[10px] font-black tracking-[0.2em] text-[#51513d] uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Sync stalled
            </div>
            <h2 className="font-black text-[#1b2021]">Could not load admin tests</h2>
            <Button
              onClick={() => attemptsQuery.refetch()}
              variant="outline"
              size="sm"
              className="mt-4 border-[#51513d]/28 bg-[#e3dcc2]/70 font-bold text-[#1b2021] hover:bg-[#e3dc95]/55"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            <AttemptList attempts={attempts} scope="admin" />
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
      {Array.from({ length: 4 }).map((_, index) => (
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
              <Skeleton className="h-5 w-72 max-w-full" />
              <Skeleton className="h-4 w-lg max-w-full" />
            </div>
          </div>
        </div>
      ))}
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
