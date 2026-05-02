"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Camera,
  RefreshCw,
  Info,
} from "lucide-react";
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
  const [showDetails, setShowDetails] = useState(false);

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

        if (active) setData(payload as ResultResponse);
      } catch (resultError) {
        if (active)
          setError(
            resultError instanceof Error
              ? resultError.message
              : "Unexpected error.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadResult();
    return () => { active = false; };
  }, [sessionId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[oklch(0.13_0.02_264)]">
        <div className="text-white/50 text-sm animate-pulse">Loading result…</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[oklch(0.13_0.02_264)] p-6">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error ?? "No data found."}</p>
          <Link
            href="/gamified-test"
            className="text-sm text-white/60 hover:text-white underline"
          >
            Try again
          </Link>
        </div>
      </main>
    );
  }

  const { result } = data;
  const riskDetected = result.riskDetected;

  return (
    <main className="min-h-screen bg-[oklch(0.13_0.02_264)] text-white flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-lg space-y-4">

        {/* ── Primary result card ──────────────────────────── */}
        <div
          className={`rounded-2xl p-8 text-center border ${
            riskDetected
              ? "border-red-500/30 bg-red-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 ${
              riskDetected ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {riskDetected ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {riskDetected ? "Dyslexia Risk Detected" : "No Risk Detected"}
          </h1>

          <p className="text-white/50 text-sm mb-6">
            Probability score:{" "}
            <span className="text-white font-semibold">
              {(result.probability * 100).toFixed(1)}%
            </span>
            <span className="text-white/30 mx-2">·</span>
            Threshold:{" "}
            <span className="text-white font-semibold">
              {(result.threshold * 100).toFixed(1)}%
            </span>
          </p>

          {/* Disclaimer */}
          <div className="flex gap-3 rounded-xl p-3 text-xs leading-relaxed text-left bg-white/5 border border-white/10 text-white/50">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400/70" />
            <span>
              <strong className="text-white/70">Screening only.</strong> This
              result is a statistical risk estimate and is{" "}
              <strong className="text-white/70">not a clinical diagnosis</strong>.
              It is based on Rello et al. (2020) — an IRB-approved gamified
              screening test validated on children aged 7–17. False positives
              and false negatives are possible. Results must be interpreted by a
              qualified speech-language pathologist or educational psychologist.
            </span>
          </div>
        </div>

        {/* ── Webcam suggestion (only if risk detected) ───── */}
        {riskDetected && (
          <div className="rounded-2xl p-6 border border-primary/30 bg-primary/10">
            <p className="text-sm text-white/70 mb-4">
              For a more comprehensive assessment, we recommend also completing
              the <strong className="text-white">Webcam Eye-Tracking Test</strong>,
              which analyses reading gaze patterns and provides an independent
              second opinion.
            </p>
            <Link
              href="/test/webcam"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Take the Webcam Test
            </Link>
          </div>
        )}

        {/* ── Details toggle ───────────────────────────────── */}
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span>View detailed results</span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* ── Detailed metrics (collapsible) ──────────────── */}
        {showDetails && (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Per-Question Breakdown
              </p>
              <p className="text-xs text-white/30">
                Source: {result.modelSource ?? "fallback"}{" "}
                {result.modelVersion ? `(${result.modelVersion})` : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-left">
                    {["Question", "Clicks", "Hits", "Misses", "Score", "Accuracy", "Missrate"].map(
                      (h) => (
                        <th key={h} className="px-4 py-3 font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.metrics.map((metric, i) => (
                    <tr
                      key={metric.questionId}
                      className={`border-b border-white/5 ${
                        i % 2 === 0 ? "" : "bg-white/[0.02]"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-white/80 uppercase">
                        {metric.questionId}
                      </td>
                      <td className="px-4 py-2.5 text-white/60">{metric.clicks}</td>
                      <td className="px-4 py-2.5 text-emerald-400">{metric.hits}</td>
                      <td className="px-4 py-2.5 text-red-400">{metric.misses}</td>
                      <td className="px-4 py-2.5 text-white/60">{metric.score}</td>
                      <td className="px-4 py-2.5 text-white/80 font-medium">
                        {(metric.accuracy * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-2.5 text-white/60">
                        {(metric.missrate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Start new session ────────────────────────────── */}
        <Link
          href="/gamified-test"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Start New Session
        </Link>
      </div>
    </main>
  );
}
