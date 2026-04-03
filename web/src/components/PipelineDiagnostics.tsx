import React from 'react';

interface PipelineMetrics {
  totalFixations?: number | null;
  meanFixationDurationMs?: number | null;
  fixationDurationSd?: number | null;
  normalizedRetentionPct?: number | null;
  fixationRetentionPct?: number | null;
  totalPipelineRetentionPct?: number | null;
  outOfBoundsPoints?: number | null;
  invalidFixationPoints?: number | null;
  meanSaccadeAmplitude?: number | null;
  totalRegressions?: number | null;
  intraFixationJitter?: number | null;
  // Legacy field
  dataRetentionPct?: number | null;
}

interface Props {
  metrics?: PipelineMetrics;
}

export function PipelineDiagnostics({ metrics }: Props) {
  if (!metrics) {
    return null;
  }

  const formatNum = (val: number | null | undefined, decimals: number = 0) =>
    val === null || val === undefined ? '-' : val.toFixed(decimals);

  return (
    <div className="mt-6 rounded-lg border bg-slate-50 p-4">
      <h3 className="mb-4 text-lg font-semibold">Pipeline Diagnostics</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Temporal Metrics */}
        <div className="rounded border bg-white p-3 shadow-sm">
          <h4 className="mb-2 text-sm font-medium text-slate-500">Temporal Metrics</h4>
          <div className="mb-1 flex justify-between text-sm">
            <span>Total Fixations:</span>
            <span className="font-semibold">{formatNum(metrics.totalFixations)}</span>
          </div>
          <div className="mb-1 flex justify-between text-sm">
            <span>Mean Duration:</span>
            <span className="font-semibold">{formatNum(metrics.meanFixationDurationMs, 1)} ms</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Duration SD:</span>
            <span className="font-semibold">{formatNum(metrics.fixationDurationSd, 1)} ms</span>
          </div>
        </div>

        {/* Spatial Metrics */}
        <div className="rounded border bg-white p-3 shadow-sm">
          <h4 className="mb-2 text-sm font-medium text-slate-500">Spatial Metrics</h4>
          <div className="mb-1 flex justify-between text-sm">
            <span>Mean Saccade Amp:</span>
            <span className="font-semibold">{formatNum(metrics.meanSaccadeAmplitude, 3)} px</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Intra-Fixation Jitter:</span>
            <span className="font-semibold">{formatNum(metrics.intraFixationJitter, 3)} px</span>
          </div>
        </div>

        {/* Data Quality: Retention Funnel */}
        <div className="rounded border bg-white p-3 shadow-sm">
          <h4 className="mb-2 text-sm font-medium text-slate-500">Data Retention Funnel</h4>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-xs">Raw → Normalized:</span>
            <span className="text-xs font-semibold">
              {formatNum(metrics.normalizedRetentionPct, 1)}%
            </span>
          </div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-xs">Normalized → Fixations:</span>
            <span className="text-xs font-semibold">
              {formatNum(metrics.fixationRetentionPct, 1)}%
            </span>
          </div>
          <div className="flex justify-between border-t pt-1 text-sm">
            <span className="text-xs font-semibold">Total Pipeline:</span>
            <span className="text-xs font-bold">
              {formatNum(metrics.totalPipelineRetentionPct, 1)}%
            </span>
          </div>
        </div>

        {/* Invalid Data */}
        <div className="rounded border bg-white p-3 shadow-sm">
          <h4 className="mb-2 text-sm font-medium text-slate-500">Invalid Data</h4>
          <div className="mb-1 flex justify-between text-sm">
            <span>Out of Bounds:</span>
            <span className="font-semibold">{formatNum(metrics.outOfBoundsPoints)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Invalid Fixations:</span>
            <span className="font-semibold">{formatNum(metrics.invalidFixationPoints)}</span>
          </div>
        </div>

        {/* Additional */}
        <div className="rounded border bg-white p-3 shadow-sm">
          <h4 className="mb-2 text-sm font-medium text-slate-500">Additional</h4>
          <div className="flex justify-between text-sm">
            <span>Total Regressions:</span>
            <span className="font-semibold">{formatNum(metrics.totalRegressions)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
