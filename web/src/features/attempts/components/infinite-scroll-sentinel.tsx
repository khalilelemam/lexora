'use client';

import { useEffect, useRef } from 'react';

interface InfiniteScrollSentinelProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: '360px 0px' },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div ref={sentinelRef} className="flex min-h-10 items-center justify-center py-2">
      {isFetchingNextPage ? (
        <div className="text-[#51513d]/60 inline-flex items-center gap-2 text-xs font-medium">
          <div className="flex gap-1">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#51513d]/60"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#51513d]/60"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#51513d]/60"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span>Loading more...</span>
        </div>
      ) : null}
    </div>
  );
}
