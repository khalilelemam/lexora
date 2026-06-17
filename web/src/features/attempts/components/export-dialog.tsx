'use client';

import { useMemo, useCallback, useState } from 'react';
import { Download, FileArchive, Filter, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { exportAdminAttempts, type ExportContentMode } from '@/features/attempts/api';
import type { AttemptFilters } from '@/features/attempts/types';
import { TEST_TYPE_LABELS, OUTCOME_LABELS } from '@/features/attempts/lib/attempt-labels';

// ── Content mode options ────────────────────────────────────

interface ContentOption {
  value: ExportContentMode;
  label: string;
  description: string;
}

const CONTENT_OPTIONS: ContentOption[] = [
  {
    value: 'derived',
    label: 'Derived data',
    description: 'Prediction results, feature CSVs, and gaze visualization images',
  },
  {
    value: 'raw',
    label: 'Raw data',
    description: 'Original gaze point recordings (only for consenting users)',
  },
  {
    value: 'both',
    label: 'All data',
    description: 'Both derived and raw data in a single export',
  },
];

// ── Active filter summary ───────────────────────────────────

function describeActiveFilters(filters: AttemptFilters): string[] {
  const tags: string[] = [];

  if (filters.testType) {
    tags.push(TEST_TYPE_LABELS[filters.testType]);
  }

  if (filters.outcomes?.length) {
    tags.push(filters.outcomes.map((o) => OUTCOME_LABELS[o]).join(', '));
  }

  if (filters.query) {
    tags.push(`"${filters.query}"`);
  }

  if (filters.createdFrom || filters.createdTo) {
    const from = filters.createdFrom ?? '…';
    const to = filters.createdTo ?? '…';
    tags.push(`${from} → ${to}`);
  }

  return tags;
}

// ── Component ───────────────────────────────────────────────

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AttemptFilters;
}

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

export function ExportDialog({ open, onOpenChange, filters }: ExportDialogProps) {
  const [selected, setSelected] = useState<ExportContentMode>('derived');
  const [includeVisuals, setIncludeVisuals] = useState(true);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filterTags = useMemo(() => describeActiveFilters(filters), [filters]);
  const hasFilters = filterTags.length > 0;

  const handleExport = useCallback(async () => {
    setStatus('exporting');
    setErrorMessage(null);

    try {
      await exportAdminAttempts(filters, selected, includeVisuals);
      setStatus('success');

      // Auto-close after a brief success indication.
      setTimeout(() => {
        onOpenChange(false);
        setStatus('idle');
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Export failed');
    }
  }, [filters, selected, includeVisuals, onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (status === 'exporting') return; // Don't close during export.
      onOpenChange(nextOpen);

      if (!nextOpen) {
        // Reset state when closing.
        setStatus('idle');
        setErrorMessage(null);
      }
    },
    [onOpenChange, status],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Export Test Data
          </DialogTitle>
          <DialogDescription>
            Download a ZIP file with feature CSVs, metadata, and optional gaze visualizations.
          </DialogDescription>
        </DialogHeader>

        {/* ── Active filter indicator ─────────────────────── */}
        <div className="bg-muted/50 rounded-lg border px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Filter className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-muted-foreground">Applies to:</span>
            {hasFilters ? (
              <span className="text-foreground">Current filters</span>
            ) : (
              <span className="text-foreground">All tests</span>
            )}
          </div>
          {hasFilters && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {filterTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-background text-muted-foreground inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Content mode selection ─────────────────────── */}
        <fieldset
          className="grid gap-2"
          disabled={status === 'exporting'}
          aria-label="Content to include"
        >
          <label className="text-muted-foreground text-xs font-medium">Include</label>
          {CONTENT_OPTIONS.map((option) => {
            const isSelected = selected === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                    : 'border-border hover:bg-accent/50',
                )}
                onClick={() => setSelected(option.value)}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs">{option.description}</span>
              </button>
            );
          })}
        </fieldset>

        {/* ── Visuals toggle ─────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div className="space-y-0.5">
            <Label htmlFor="include-visuals" className="text-sm font-medium">
              Gaze visualizations
            </Label>
            <p className="text-muted-foreground text-xs">
              Generate PNG images of gaze patterns per test
            </p>
          </div>
          <Switch
            id="include-visuals"
            checked={includeVisuals}
            onCheckedChange={setIncludeVisuals}
            disabled={status === 'exporting' || selected === 'raw'}
          />
        </div>

        {status === 'error' && errorMessage && (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage}
          </p>
        )}

        {status === 'success' && (
          <p className="text-sm text-emerald-600" role="status">
            Export started — check your downloads.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={status === 'exporting'}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={status === 'exporting' || status === 'success'}
            onClick={handleExport}
          >
            {status === 'exporting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export ZIP
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
