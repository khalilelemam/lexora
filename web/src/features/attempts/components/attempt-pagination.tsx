'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AttemptsPagination as AttemptsPaginationMeta } from '@/features/attempts/types';

interface AttemptsPaginationProps {
  pagination: AttemptsPaginationMeta;
  onPageChange: (page: number) => void;
}

export function AttemptsPagination({ pagination, onPageChange }: AttemptsPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label="Attempt pagination"
    >
      <p className="text-muted-foreground text-sm">
        Page {pagination.page} of {pagination.totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
