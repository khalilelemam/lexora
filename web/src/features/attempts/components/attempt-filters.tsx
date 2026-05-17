'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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

interface AttemptFiltersPanelProps {
  filters: AttemptFilters;
  onChange: (filters: AttemptFilters) => void;
  resultCount?: number;
}

export function AttemptFiltersPanel({ filters, onChange, resultCount }: AttemptFiltersPanelProps) {
  const [queryDraft, setQueryDraft] = useState(filters.query ?? '');
  const hasFilters = Boolean(filters.query || filters.testType || filters.outcome);

  const updateFilters = (next: AttemptFilters) => {
    onChange({ ...next, page: 1 });
  };

  return (
    <section className="border-border bg-card rounded-lg border p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        <div className="text-muted-foreground text-xs">
          {typeof resultCount === 'number' ? `${resultCount} result${resultCount === 1 ? '' : 's'}` : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_170px_190px_auto] lg:items-end">
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateFilters({ ...filters, query: queryDraft.trim() || undefined });
          }}
        >
          <Label htmlFor="attempt-search" className="text-xs">
            Search
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="attempt-search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
                placeholder="Label, outcome, user email"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>

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

        <FilterSelect
          label="Outcome"
          value={filters.outcome ?? ALL_VALUE}
          options={OUTCOME_LABELS}
          onChange={(outcome) =>
            updateFilters({
              ...filters,
              outcome: outcome === ALL_VALUE ? undefined : (outcome as RiskLevel),
            })
          }
        />

        <Button
          type="button"
          variant="ghost"
          disabled={!hasFilters}
          onClick={() => {
            setQueryDraft('');
            onChange({ page: 1, pageSize: filters.pageSize });
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
