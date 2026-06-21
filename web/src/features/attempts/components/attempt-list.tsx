'use client';

import { useState } from 'react';
import { Gauge } from 'lucide-react';

import { Accordion } from '@/components/ui/accordion';
import type { AttemptListItem } from '@/features/attempts/types';

import { AttemptCard } from './attempt-card';

interface AttemptListProps {
  attempts: AttemptListItem[];
  scope: 'user' | 'admin';
}

export function AttemptList({ attempts, scope }: AttemptListProps) {
  const [openAttemptId, setOpenAttemptId] = useState<string>();

  if (attempts.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-[#51513d]/18 bg-[#f3edd7] p-8 text-center">
        <Gauge className="mb-3 h-8 w-8 text-[#51513d]" />
        <h2 className="text-lg font-semibold text-[#1b2021]">No tests found</h2>
        <p className="mt-1 max-w-md text-sm text-[#1b2021]/70">
          Try clearing filters, or complete a screening test to create a saved result.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible value={openAttemptId} onValueChange={setOpenAttemptId}>
      <div className="grid gap-3">
        {attempts.map((attempt, index) => (
          <AttemptCard
            key={`${attempt.attemptId}-${index}`}
            attempt={attempt}
            scope={scope}
            expanded={openAttemptId === attempt.attemptId}
          />
        ))}
      </div>
    </Accordion>
  );
}
