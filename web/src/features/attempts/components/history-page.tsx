'use client';

import Link from 'next/link';
import { Activity, RefreshCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { useMyAttempts } from '@/features/attempts/hooks/use-attempts';
import type { AttemptFilters } from '@/features/attempts/types';

import { AttemptFiltersPanel } from './attempt-filters';
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

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/">
            <LexoraLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/test/webcam">New Webcam Test</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/test/tobii">New Tobii Test</Link>
            </Button>
          </div>
        </header>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="text-primary h-5 w-5" />
            <h1 className="text-2xl font-semibold tracking-normal">Test History</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Your saved screening tests and outcomes.
          </p>
        </section>

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
    </main>
  );
}

function AttemptListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border-border bg-card rounded-lg border p-4 shadow-sm">
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
    <div className="border-destructive/20 bg-card rounded-lg border p-6">
      <h2 className="font-semibold">Could not load tests</h2>
      <p className="text-muted-foreground mt-1 text-sm">Please try again.</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
        <RefreshCcw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}
