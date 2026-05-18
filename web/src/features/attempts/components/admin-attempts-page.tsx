'use client';

import Link from 'next/link';
import { RefreshCcw, Shield } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { useAdminAttempts } from '@/features/attempts/hooks/use-attempts';
import type { AttemptFilters } from '@/features/attempts/types';

import { AttemptFiltersPanel } from './attempt-filters';
import { InfiniteScrollSentinel } from './infinite-scroll-sentinel';
import { AttemptList } from './attempt-list';

const DEFAULT_FILTERS: AttemptFilters = {
  limit: 12,
};

export function AdminAttemptsPage() {
  const [filters, setFilters] = useState<AttemptFilters>(DEFAULT_FILTERS);
  const attemptsQuery = useAdminAttempts(filters);
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/">
            <LexoraLogo size="sm" />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/history">My History</Link>
          </Button>
        </header>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-5 w-5" />
            <h1 className="text-2xl font-semibold tracking-normal">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Admin view of saved screening tests across users.
          </p>
        </section>

        <AttemptFiltersPanel
          filters={filters}
          onChange={setFilters}
          resultCount={total}
        />

        {attemptsQuery.isPending ? (
          <AttemptListSkeleton />
        ) : attemptsQuery.isError ? (
          <div className="border-destructive/20 bg-card rounded-lg border p-6">
            <h2 className="font-semibold">Could not load admin tests</h2>
            <Button
              onClick={() => attemptsQuery.refetch()}
              variant="outline"
              size="sm"
              className="mt-4"
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
    </main>
  );
}

function AttemptListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-border bg-card rounded-lg border p-4 shadow-sm">
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
