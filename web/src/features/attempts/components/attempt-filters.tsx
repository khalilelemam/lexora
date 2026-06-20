'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import type { AttemptFilters } from '@/features/attempts/types';
import { TEST_TYPE_LABELS } from '@/features/attempts/lib/attempt-labels';
import type { TestMode } from '@/features/test/types';

import { DateRangePicker } from './date-range-picker';
import { FilterSelect } from './filter-select';
import { OutcomeFilter } from './outcome-filter';

const ALL_VALUE = 'all';
const SEARCH_DEBOUNCE_MS = 350;

interface AttemptFiltersPanelProps {
  filters: AttemptFilters;
  onChange: (filters: AttemptFilters) => void;
  resultCount?: number;
}

export function AttemptFiltersPanel({ filters, onChange, resultCount }: AttemptFiltersPanelProps) {
  const [queryDraft, setQueryDraft] = useState(filters.query ?? '');
  const debouncedQuery = useDebounce(queryDraft, SEARCH_DEBOUNCE_MS);
  const selectedOutcomes = useMemo(() => filters.outcomes ?? [], [filters.outcomes]);
  const hasFilters = Boolean(
    filters.query ||
    filters.testType ||
    selectedOutcomes.length ||
    filters.createdFrom ||
    filters.createdTo ||
    filters.minCalibrationAccuracy !== undefined,
  );

  // Ref keeps the latest filters available to the debounce effect without
  // re-triggering it when unrelated filters (type, outcome, date) change.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  });

  const updateFilters = useCallback(
    (next: AttemptFilters) => {
      const withoutCursor = { ...next };
      delete withoutCursor.cursor;
      onChange(withoutCursor);
    },
    [onChange],
  );

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim() || undefined;
    const current = filtersRef.current;
    if ((current.query ?? undefined) === normalizedQuery) {
      return;
    }

    updateFilters({ ...current, query: normalizedQuery });
  }, [debouncedQuery, updateFilters]);

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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_170px_190px_minmax(200px,1fr)_auto] xl:items-end">
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
          allValue={ALL_VALUE}
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
          <OutcomeFilter
            value={selectedOutcomes}
            onChange={(outcomes) =>
              updateFilters({
                ...filters,
                outcomes: outcomes.length > 0 ? outcomes : undefined,
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Date range</Label>
          <DateRangePicker
            value={{ from: filters.createdFrom, to: filters.createdTo }}
            onChange={(range) =>
              updateFilters({
                ...filters,
                createdFrom: range.from,
                createdTo: range.to,
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="min-calibration" className="text-xs">
            Min Calibration Acc (%)
          </Label>
          <Input
            id="min-calibration"
            type="number"
            min="0"
            max="100"
            placeholder="e.g. 80"
            value={filters.minCalibrationAccuracy ?? ''}
            onChange={(event) => {
              const val = event.target.value ? parseInt(event.target.value, 10) : undefined;
              updateFilters({ ...filters, minCalibrationAccuracy: val });
            }}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          disabled={!hasFilters}
          className="md:col-span-2 md:justify-self-end xl:col-span-1"
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
