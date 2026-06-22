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
      <div className="flex min-h-64 flex-col items-center justify-center border border-[#51513d]/18 bg-[#f3edd7]/86 p-8 text-center shadow-[10px_10px_0_rgba(81,81,61,.09)]">
        <div className="mb-4 grid h-14 w-14 place-items-center border border-[#51513d]/18 bg-[#e3dcc2] text-[#51513d] shadow-[5px_5px_0_rgba(81,81,61,.1)]">
          <Gauge className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-black text-[#1b2021]">No tests found</h2>
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
