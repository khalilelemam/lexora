'use client';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OUTCOME_LABELS } from '@/features/attempts/lib/attempt-labels';
import type { RiskLevel } from '@/features/test/types';

const OUTCOME_OPTIONS = Object.keys(OUTCOME_LABELS) as RiskLevel[];

interface OutcomeFilterProps {
  value: RiskLevel[];
  onChange: (outcomes: RiskLevel[]) => void;
}

export function OutcomeFilter({ value, onChange }: OutcomeFilterProps) {
  const toggleOutcome = (outcome: RiskLevel) => {
    const nextOutcomes = value.includes(outcome)
      ? value.filter((selectedOutcome) => selectedOutcome !== outcome)
      : [...value, outcome];

    onChange(nextOutcomes);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="justify-between">
          <span className="truncate">{formatOutcomeSelection(value)}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {OUTCOME_OPTIONS.map((outcome) => (
          <DropdownMenuCheckboxItem
            key={outcome}
            checked={value.includes(outcome)}
            onCheckedChange={() => toggleOutcome(outcome)}
            onSelect={(event) => event.preventDefault()}
          >
            {OUTCOME_LABELS[outcome]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatOutcomeSelection(outcomes: RiskLevel[]) {
  if (outcomes.length === 0) {
    return 'All outcomes';
  }

  if (outcomes.length === 1) {
    return OUTCOME_LABELS[outcomes[0]];
  }

  return `${outcomes.length} outcomes`;
}
