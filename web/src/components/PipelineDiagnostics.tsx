import React from 'react';

interface PipelineMetrics {
    totalFixations: number | null;
    meanFixationDurationMs: number | null;
    fixationDurationSd: number | null;
    normalizedRetentionPct: number | null;
    fixationRetentionPct: number | null;
    totalPipelineRetentionPct: number | null;
    outOfBoundsPoints: number | null;
    invalidFixationPoints: number | null;
    meanSaccadeAmplitude: number | null;
    totalRegressions: number | null;
    intraFixationJitter: number | null;
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

    const formatNum = (val: number | null, decimals: number = 0) =>
        val === null || val === undefined ? '-' : val.toFixed(decimals);

    return (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
            <h3 className="text-lg font-semibold mb-4">Pipeline Diagnostics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Temporal Metrics */}
                <div className="p-3 bg-white border rounded shadow-sm">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Temporal Metrics</h4>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Total Fixations:</span>
                        <span className="font-semibold">{formatNum(metrics.totalFixations)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Mean Duration:</span>
                        <span className="font-semibold">{formatNum(metrics.meanFixationDurationMs, 1)} ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Duration SD:</span>
                        <span className="font-semibold">{formatNum(metrics.fixationDurationSd, 1)} ms</span>
                    </div>
                </div>

                {/* Spatial Metrics */}
                <div className="p-3 bg-white border rounded shadow-sm">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Spatial Metrics</h4>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Mean Saccade Amp:</span>
                        <span className="font-semibold">{formatNum(metrics.meanSaccadeAmplitude, 3)} px</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Intra-Fixation Jitter:</span>
                        <span className="font-semibold">{formatNum(metrics.intraFixationJitter, 3)} px</span>
                    </div>
                </div>

                {/* Data Quality: Retention Funnel */}
                <div className="p-3 bg-white border rounded shadow-sm">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Data Retention Funnel</h4>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-xs">Raw → Normalized:</span>
                        <span className="font-semibold text-xs">{formatNum(metrics.normalizedRetentionPct, 1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-xs">Normalized → Fixations:</span>
                        <span className="font-semibold text-xs">{formatNum(metrics.fixationRetentionPct, 1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-1">
                        <span className="text-xs font-semibold">Total Pipeline:</span>
                        <span className="font-bold text-xs">{formatNum(metrics.totalPipelineRetentionPct, 1)}%</span>
                    </div>
                </div>

                {/* Invalid Data */}
                <div className="p-3 bg-white border rounded shadow-sm">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Invalid Data</h4>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Out of Bounds:</span>
                        <span className="font-semibold">{formatNum(metrics.outOfBoundsPoints)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Invalid Fixations:</span>
                        <span className="font-semibold">{formatNum(metrics.invalidFixationPoints)}</span>
                    </div>
                </div>

                {/* Additional */}
                <div className="p-3 bg-white border rounded shadow-sm">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Additional</h4>
                    <div className="flex justify-between text-sm">
                        <span>Total Regressions:</span>
                        <span className="font-semibold">{formatNum(metrics.totalRegressions)}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
