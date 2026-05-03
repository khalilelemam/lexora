"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SessionResult } from "@/features/gamified-test/lib/types";

type ResultPayload = {
  sessionId: string;
  completedAt?: string;
  result: SessionResult;
};

export default function DetailsPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultPayload | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`gt_result_${sessionId}`);
      if (!raw) {
        setError("Result not found. Please complete the test first.");
      } else {
        setData(JSON.parse(raw) as ResultPayload);
      }
    } catch {
      setError("Unable to load result.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#ede8de]">
        <div className="text-[#7a7567] text-sm animate-pulse">Loading…</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#ede8de] p-6">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error ?? "No data found."}</p>
          <Link
            href="/gamified-test"
            className="text-sm text-[#51513d] hover:text-[#2d2a24] underline"
          >
            Start over
          </Link>
        </div>
      </main>
    );
  }

  const { result } = data;

  const avgAccuracy =
    result.metrics.reduce((s, m) => s + m.accuracy, 0) / result.metrics.length;

  return (
    <main className="min-h-screen bg-[#ede8de] p-4 pt-10 pb-16">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href={`/gamified-test/result/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#7a7567] hover:text-[#2d2a24] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to result
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#2d2a24]">
            Per-Question Breakdown
          </h1>
          <p className="text-sm text-[#7a7567] mt-1">
            Model:{" "}
            <span className="font-medium text-[#51513d]">
              {result.modelSource ?? "fallback"}
              {result.modelVersion ? ` · ${result.modelVersion}` : ""}
            </span>
          </p>
        </div>

        {/* ── Summary bar ───────────────────────────────────── */}
        <div className="rounded-2xl border border-[#c8c4b8] bg-[#faf8f4] shadow-sm px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            {
              label: "Avg Accuracy",
              value: `${(avgAccuracy * 100).toFixed(0)}%`,
              color: "text-[#2d2a24]",
            },
            {
              label: "Total Hits",
              value: result.metrics.reduce((s, m) => s + m.hits, 0),
              color: "text-emerald-600",
            },
            {
              label: "Total Misses",
              value: result.metrics.reduce((s, m) => s + m.misses, 0),
              color: "text-red-500",
            },
            {
              label: "Total Clicks",
              value: result.metrics.reduce((s, m) => s + m.clicks, 0),
              color: "text-[#51513d]",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-[#9a9287] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Detail table ─────────────────────────────────── */}
        <div className="rounded-2xl border border-[#c8c4b8] bg-[#faf8f4] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e0dcd4]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7a7567]">
              All Questions ({result.metrics.length})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0dcd4] text-[#9a9287] text-left text-xs">
                  {[
                    "Question",
                    "Clicks",
                    "Hits",
                    "Misses",
                    "Score",
                    "Accuracy",
                    "Miss Rate",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-semibold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.metrics.map((metric, i) => {
                  const acc = metric.accuracy;
                  const TrendIcon =
                    acc >= 0.7
                      ? TrendingUp
                      : acc >= 0.4
                        ? Minus
                        : TrendingDown;
                  const trendColor =
                    acc >= 0.7
                      ? "text-emerald-600"
                      : acc >= 0.4
                        ? "text-amber-500"
                        : "text-red-500";

                  return (
                    <tr
                      key={metric.questionId}
                      className={`border-b border-[#e8e4da] ${
                        i % 2 === 0 ? "bg-[#faf8f4]" : "bg-[#f4f1ec]"
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#2d2a24] uppercase">
                        {metric.questionId}
                      </td>
                      <td className="px-4 py-3 text-[#51513d]">
                        {metric.clicks}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-600">
                        {metric.hits}
                      </td>
                      <td className="px-4 py-3 font-medium text-red-500">
                        {metric.misses}
                      </td>
                      <td className="px-4 py-3 text-[#51513d]">
                        {metric.score}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2d2a24]">
                        {(acc * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-[#7a7567]">
                        {(metric.missrate * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3">
                        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer nav ────────────────────────────────────── */}
        <Link
          href={`/gamified-test/result/${sessionId}`}
          className="flex items-center gap-2 text-sm text-[#7a7567] hover:text-[#2d2a24] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to result summary
        </Link>
      </div>
    </main>
  );
}
