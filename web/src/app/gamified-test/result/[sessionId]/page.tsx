"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionResult } from "@/features/gamified-test/lib/types";

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
        const response = await fetch(
          `/api/gamified-test/session/${sessionId}/result`,
        );
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

    void loadResult();

    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Assessment Result</h1>

      {loading ? <p className="mt-4 text-sm">Loading result...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {!loading && !error && data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Probability"
              value={`${(data.result.probability * 100).toFixed(2)}%`}
            />
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

          <p className="mt-3 text-sm text-slate-600">
            Source: {data.result.modelSource ?? "fallback"}
            {data.result.modelVersion ? ` (${data.result.modelVersion})` : ""}
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
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
                  <tr key={metric.questionId} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium">{metric.questionId}</td>
                    <td className="px-3 py-2">{metric.clicks}</td>
                    <td className="px-3 py-2">{metric.hits}</td>
                    <td className="px-3 py-2">{metric.misses}</td>
                    <td className="px-3 py-2">{metric.score}</td>
                    <td className="px-3 py-2">{metric.accuracy.toFixed(2)}</td>
                    <td className="px-3 py-2">{metric.missrate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <Link
              href="/gamified-test"
              className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Start New Session
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
