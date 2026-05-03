"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, ChevronRight, Info } from "lucide-react";

type Theme = "gamified" | "light";

type SessionStartResponse = {
  sessionId?: string;
  questionIds?: number[];
  error?: string;
};

export default function GamifiedTestStartPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("gamified");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState<number>(9);
  const [nativeLang, setNativeLang] = useState(true);
  const [otherLang, setOtherLang] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/gamified-test/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          gender,
          nativeLang,
          otherLang,
          examLanguage: "en",
          theme,
        }),
      });

      const payload = (await response.json()) as SessionStartResponse;
      if (!response.ok || !payload.sessionId || !payload.questionIds) {
        throw new Error(payload.error ?? "Unable to start the test.");
      }

      // Store demographics + question IDs client-side so the test page
      // never needs to re-fetch from server (Vercel stateless functions).
      sessionStorage.setItem(
        `gt_session_${payload.sessionId}`,
        JSON.stringify({
          sessionId: payload.sessionId,
          demographics: { age, gender, nativeLang, otherLang },
          questionIds: payload.questionIds,
          theme: theme === "gamified" ? "dark" : "light",
        }),
      );

      router.push(
        `/gamified-test/test/${payload.sessionId}?lang=en&theme=${theme === "gamified" ? "dark" : "light"}`,
      );
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Unexpected error.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[oklch(0.92_0.02_90)]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-[oklch(0.40_0.04_110)]/10 text-[oklch(0.40_0.04_110)]">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.18_0.01_180)]">
            Gamified Screening Test
          </h1>
          <p className="mt-2 text-sm text-[oklch(0.52_0.02_90)]">
            A short interactive assessment — no hardware required.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 shadow-sm bg-[oklch(0.96_0.015_90)] border border-[oklch(0.86_0.02_90)]">

          {/* Form */}
          <form onSubmit={handleStart} className="space-y-5">

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[oklch(0.52_0.02_90)]">
                Age (7 – 17)
              </label>
              <input
                type="number"
                min={7}
                max={17}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium outline-none transition-colors bg-[oklch(0.90_0.015_90)] border border-[oklch(0.86_0.02_90)] text-[oklch(0.18_0.01_180)] focus:border-[oklch(0.40_0.04_110)] focus:ring-1 focus:ring-[oklch(0.40_0.04_110)]"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[oklch(0.52_0.02_90)]">
                Gender
              </label>
              <div className="flex rounded-xl p-1 bg-[oklch(0.88_0.02_90)]">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                      gender === g
                        ? "bg-[oklch(0.40_0.04_110)] text-[oklch(0.94_0.02_90)] shadow"
                        : "text-[oklch(0.52_0.02_90)] hover:text-[oklch(0.18_0.01_180)]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Language toggles */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.52_0.02_90)]">
                Language
              </p>
              {[
                {
                  checked: nativeLang,
                  onChange: setNativeLang,
                  label: "English is my native language",
                },
                {
                  checked: otherLang,
                  onChange: setOtherLang,
                  label: "I also speak another language",
                },
              ].map(({ checked, onChange, label }) => (
                <label
                  key={label}
                  className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg transition-colors hover:bg-[oklch(0.88_0.02_90)]"
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked
                        ? "bg-[oklch(0.40_0.04_110)] border-[oklch(0.40_0.04_110)]"
                        : "border-[oklch(0.70_0.03_90)]"
                    }`}
                    onClick={() => onChange(!checked)}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[oklch(0.30_0.02_90)]">{label}</span>
                </label>
              ))}
            </div>

            <hr className="border-[oklch(0.86_0.02_90)]" />

            {/* Test Theme */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-[oklch(0.52_0.02_90)]">
                Test Display Theme
              </p>
              <div className="flex rounded-xl p-1 bg-[oklch(0.88_0.02_90)]">
                <button
                  type="button"
                  onClick={() => setTheme("gamified")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    theme === "gamified"
                      ? "bg-[oklch(0.40_0.04_110)] text-[oklch(0.94_0.02_90)] shadow"
                      : "text-[oklch(0.52_0.02_90)] hover:text-[oklch(0.18_0.01_180)]"
                  }`}
                >
                  <span>🎮</span>
                  Gamified
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    theme === "light"
                      ? "bg-[oklch(0.40_0.04_110)] text-[oklch(0.94_0.02_90)] shadow"
                      : "text-[oklch(0.52_0.02_90)] hover:text-[oklch(0.18_0.01_180)]"
                  }`}
                >
                  <span>☀️</span>
                  Light
                </button>
              </div>
              <p className="mt-2 text-xs text-[oklch(0.60_0.02_90)]">
                {theme === "gamified"
                  ? "Animated background with vibrant game-style cards."
                  : "Clean white background, light borders — easier on the eyes."}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 border border-red-100">
                {error}
              </p>
            )}

            {/* Disclaimer */}
            <div className="flex gap-3 rounded-lg p-3 text-xs leading-relaxed bg-amber-50 text-amber-700 border border-amber-100">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This test is a <strong>screening tool only</strong> and does not
                constitute a clinical diagnosis. Results should be interpreted by
                qualified professionals.
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all bg-[oklch(0.40_0.04_110)] text-[oklch(0.94_0.02_90)] hover:bg-[oklch(0.35_0.04_110)] disabled:opacity-50"
            >
              {isSubmitting ? (
                "Starting…"
              ) : (
                <>
                  Start Assessment
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
