'use client';

import Link from 'next/link';
import { RefreshCcw, Shield } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { useAdminAttempts } from '@/features/attempts/hooks/use-attempts';
import type { AttemptFilters } from '@/features/attempts/types';

import { AttemptFiltersPanel } from './attempt-filters';
import { AttemptList } from './attempt-list';
import { AttemptsPagination } from './attempt-pagination';

const DEFAULT_FILTERS: AttemptFilters = {
  page: 1,
  pageSize: 10,
};

export function AdminAttemptsPage() {
  const [filters, setFilters] = useState<AttemptFilters>(DEFAULT_FILTERS);
  const attemptsQuery = useAdminAttempts(filters);

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
            <h1 className="text-2xl font-semibold tracking-normal">Test Attempts</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Admin view of saved screening attempts across users.
          </p>
        </section>

        <AttemptFiltersPanel
          filters={filters}
          onChange={setFilters}
          resultCount={attemptsQuery.data?.pagination.total}
        />

        {attemptsQuery.isPending ? (
          <AttemptListSkeleton />
        ) : attemptsQuery.isError ? (
          <div className="border-destructive/20 bg-card rounded-lg border p-6">
            <h2 className="font-semibold">Could not load admin attempts</h2>
            <Button onClick={() => attemptsQuery.refetch()} variant="outline" size="sm" className="mt-4">
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            <AttemptList attempts={attemptsQuery.data.attempts} scope="admin" />
            <AttemptsPagination
              pagination={attemptsQuery.data.pagination}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
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
              <Skeleton className="h-4 w-[32rem] max-w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
