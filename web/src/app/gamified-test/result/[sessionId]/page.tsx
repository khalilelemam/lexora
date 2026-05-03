"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  RefreshCw,
  Info,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import type { SessionResult } from "@/features/gamified-test/lib/types";

type ResultPayload = {
  sessionId: string;
  completedAt?: string;
  result: SessionResult;
};

export default function ResultPage() {
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

  /* ─── Loading ───────────────────────────────────────────── */
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#ede8de]">
        <div className="text-[#7a7567] text-sm animate-pulse">Loading result…</div>
      </main>
    );
  }

  /* ─── Error ──────────────────────────────────────────────── */
  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#ede8de] p-6">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error ?? "No data found."}</p>
          <Link
            href="/gamified-test"
            className="text-sm text-[#51513d] hover:text-[#2d2a24] underline"
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
    <main className="min-h-screen bg-[#ede8de] flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-lg space-y-4">

        {/* ── Primary result card ──────────────────────────── */}
        <div
          className={`rounded-2xl p-8 text-center border shadow-sm ${
            riskDetected
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 ${
              riskDetected
                ? "bg-red-100 text-red-500"
                : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {riskDetected ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>

          <h1 className="text-2xl font-bold mb-2 text-[#2d2a24]">
            {riskDetected ? "Dyslexia Risk Detected" : "No Risk Detected"}
          </h1>

          <div className="flex items-center justify-center gap-4 text-sm mb-6">
            <span className="text-[#7a7567]">
              Probability:{" "}
              <span className="font-semibold text-[#2d2a24]">
                {(result.probability * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-[#c8c4b8]">·</span>
            <span className="text-[#7a7567]">
              Threshold:{" "}
              <span className="font-semibold text-[#2d2a24]">
                {(result.threshold * 100).toFixed(1)}%
              </span>
            </span>
          </div>

          {/* Disclaimer */}
          <div className="flex gap-3 rounded-xl p-3 text-xs leading-relaxed text-left bg-amber-50 border border-amber-200 text-amber-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>
              <strong>Screening only.</strong> This result is a statistical risk
              estimate and is <strong>not a clinical diagnosis</strong>. Based on
              Rello et al. (2020) — IRB-approved, validated on children 7–17.
              Must be interpreted by a qualified professional.
            </span>
          </div>
        </div>

        {/* ── Webcam suggestion (only if risk detected) ────── */}
        {riskDetected && (
          <div className="rounded-2xl p-6 border border-[#b8c9a8] bg-[#f0f5ec] shadow-sm">
            <p className="text-sm text-[#5a7a48] mb-4 font-medium">
              For a more thorough assessment, we recommend the{" "}
              <strong>Webcam Eye-Tracking Test</strong> — it analyses reading gaze
              patterns and provides an independent second opinion.
            </p>
            <Link
              href="/test/webcam"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a7a48] text-white text-sm font-semibold hover:bg-[#4a6a38] transition-colors"
            >
              <Camera className="w-4 h-4" />
              Take the Webcam Test
            </Link>
          </div>
        )}

        {/* ── Summary stats strip ──────────────────────────── */}
        <div className="rounded-2xl border border-[#c8c4b8] bg-[#faf8f4] shadow-sm px-6 py-5 grid grid-cols-3 gap-4 text-center">
          {[
            {
              label: "Questions",
              value: result.metrics.length,
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
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-[#9a9287] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── View detailed breakdown ───────────────────────── */}
        <Link
          href={`/gamified-test/result/${sessionId}/details`}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-[#c8c4b8] bg-[#faf8f4] text-sm text-[#51513d] hover:bg-[#f0ede5] hover:border-[#a8a49a] transition-colors shadow-sm group"
        >
          <span className="flex items-center gap-2 font-medium">
            <BarChart3 className="w-4 h-4 text-[#7a7567]" />
            View per-question breakdown
          </span>
          <ChevronRight className="w-4 h-4 text-[#9a9287] group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* ── Start new session ────────────────────────────── */}
        <Link
          href="/gamified-test"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#c8c4b8] bg-[#faf8f4] text-sm text-[#7a7567] hover:text-[#2d2a24] hover:bg-[#f0ede5] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Start New Session
        </Link>
      </div>
    </main>
  );
}
