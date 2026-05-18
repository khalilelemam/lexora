'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AttemptFilters } from '@/features/attempts/types';
import {
  OUTCOME_LABELS,
  TEST_TYPE_LABELS,
} from '@/features/attempts/lib/attempt-labels';
import type { RiskLevel, TestMode } from '@/features/test/types';

const ALL_VALUE = 'all';
const SEARCH_DEBOUNCE_MS = 350;
const OUTCOME_OPTIONS = Object.keys(OUTCOME_LABELS) as RiskLevel[];

interface AttemptFiltersPanelProps {
  filters: AttemptFilters;
  onChange: (filters: AttemptFilters) => void;
  resultCount?: number;
}

export function AttemptFiltersPanel({ filters, onChange, resultCount }: AttemptFiltersPanelProps) {
  const [queryDraft, setQueryDraft] = useState(filters.query ?? '');
  const selectedOutcomes = useMemo(() => filters.outcomes ?? [], [filters.outcomes]);
  const hasFilters = Boolean(
    filters.query ||
      filters.testType ||
      selectedOutcomes.length ||
      filters.createdFrom ||
      filters.createdTo,
  );

  const updateFilters = useCallback(
    (next: AttemptFilters) => {
      const withoutCursor = { ...next };
      delete withoutCursor.cursor;
      onChange(withoutCursor);
    },
    [onChange],
  );

  useEffect(() => {
    const normalizedQuery = queryDraft.trim() || undefined;
    if ((filters.query ?? undefined) === normalizedQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      updateFilters({ ...filters, query: normalizedQuery });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [filters, queryDraft, updateFilters]);

  const toggleOutcome = (outcome: RiskLevel) => {
    const nextOutcomes = selectedOutcomes.includes(outcome)
      ? selectedOutcomes.filter((value) => value !== outcome)
      : [...selectedOutcomes, outcome];

    updateFilters({
      ...filters,
      outcomes: nextOutcomes.length > 0 ? nextOutcomes : undefined,
    });
  };

  return (
    <section className="border-border bg-card rounded-lg border p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        <div className="text-muted-foreground text-xs">
          {typeof resultCount === 'number'
            ? `${resultCount} test${resultCount === 1 ? '' : 's'}`
            : null}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_170px_190px_1fr_auto] xl:items-end">
        <div className="grid gap-2">
          <Label htmlFor="test-search" className="text-xs">
            Search
          </Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="test-search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Label, outcome, user email"
              className="pr-9 pl-9"
            />
            {queryDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => {
                  setQueryDraft('');
                  updateFilters({ ...filters, query: undefined });
                }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <FilterSelect
          label="Test type"
          value={filters.testType ?? ALL_VALUE}
          options={TEST_TYPE_LABELS}
          onChange={(testType) =>
            updateFilters({
              ...filters,
              testType: testType === ALL_VALUE ? undefined : (testType as TestMode),
            })
          }
        />

        <div className="grid gap-2">
          <Label className="text-xs">Outcome</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="justify-between">
                <span className="truncate">{formatOutcomeSelection(selectedOutcomes)}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {OUTCOME_OPTIONS.map((outcome) => (
                <DropdownMenuCheckboxItem
                  key={outcome}
                  checked={selectedOutcomes.includes(outcome)}
                  onCheckedChange={() => toggleOutcome(outcome)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {OUTCOME_LABELS[outcome]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Date range</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="relative">
              <CalendarDays className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="date"
                value={filters.createdFrom ?? ''}
                max={filters.createdTo}
                onChange={(event) =>
                  updateFilters({
                    ...filters,
                    createdFrom: event.target.value || undefined,
                  })
                }
                className="pl-9"
                aria-label="Start date"
              />
            </div>
            <div className="relative">
              <CalendarDays className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="date"
                value={filters.createdTo ?? ''}
                min={filters.createdFrom}
                onChange={(event) =>
                  updateFilters({
                    ...filters,
                    createdTo: event.target.value || undefined,
                  })
                }
                className="pl-9"
                aria-label="End date"
              />
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          disabled={!hasFilters}
          onClick={() => {
            setQueryDraft('');
            onChange({ limit: filters.limit });
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </section>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<T, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All</SelectItem>
          {Object.entries(options).map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel as string}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
