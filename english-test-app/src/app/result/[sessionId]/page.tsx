"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SessionResult } from "@/lib/types";

type ResultResponse = {
  sessionId: string;
  result: SessionResult;
};

export default function ResultPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadResult() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/session/${sessionId}/result`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load result.");
        }

        if (active) {
          setData(payload as ResultResponse);
        }
      } catch (resultError) {
        if (active) {
          setError(
            resultError instanceof Error
              ? resultError.message
              : "Unexpected error.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      active = false;
    };
  }, [sessionId]);

  const percentage = useMemo(() => {
    if (!data) {
      return "0.00";
    }

    return (data.result.probability * 100).toFixed(2);
  }, [data]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">
          Assessment Result
        </h1>

        {loading ? (
          <p className="mt-4 text-slate-600">Loading result...</p>
        ) : null}
        {error ? <p className="mt-4 text-red-700">{error}</p> : null}

        {!loading && !error && data ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Probability" value={`${percentage}%`} />
              <StatCard
                label="Threshold"
                value={data.result.threshold.toFixed(3)}
              />
              <StatCard label="Prediction" value={data.result.label} />
              <StatCard
                label="Risk"
                value={data.result.riskDetected ? "Detected" : "Not Detected"}
              />
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Source: {data.result.modelSource ?? "fallback"}
              {data.result.modelVersion ? ` (${data.result.modelVersion})` : ""}
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Clicks</th>
                    <th className="px-3 py-2">Hits</th>
                    <th className="px-3 py-2">Misses</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Accuracy</th>
                    <th className="px-3 py-2">Missrate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.result.metrics.map((metric) => (
                    <tr
                      key={metric.questionId}
                      className="border-b border-slate-100 text-slate-700"
                    >
                      <td className="px-3 py-2 font-medium">
                        {metric.questionId}
                      </td>
                      <td className="px-3 py-2">{metric.clicks}</td>
                      <td className="px-3 py-2">{metric.hits}</td>
                      <td className="px-3 py-2">{metric.misses}</td>
                      <td className="px-3 py-2">{metric.score}</td>
                      <td className="px-3 py-2">
                        {metric.accuracy.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {metric.missrate.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Start New Test
          </Link>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
