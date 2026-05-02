"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Moon, Sun, ChevronRight, Info } from "lucide-react";

type Theme = "dark" | "light";

type SessionStartResponse = {
  sessionId?: string;
  error?: string;
};

export default function GamifiedTestStartPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState<number>(9);
  const [nativeLang, setNativeLang] = useState(true);
  const [otherLang, setOtherLang] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === "dark";

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
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Unable to start the test.");
      }

      // Route through the en shim — it redirects to the actual test page
      // with ?lang=en&theme=... preserved
      router.push(
        `/gamified-test/test/en/${payload.sessionId}?theme=${theme}`,
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
    <main
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark
          ? "bg-[oklch(0.13_0.02_264)] text-white"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${
              isDark
                ? "bg-primary/20 text-primary"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            <Gamepad2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gamified Screening Test</h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? "text-white/50" : "text-slate-500"
            }`}
          >
            A short interactive assessment — no hardware required.
          </p>
        </div>

        {/* Card */}
        <div
          className={`rounded-2xl p-6 shadow-lg ${
            isDark
              ? "bg-white/5 border border-white/10 backdrop-blur-sm"
              : "bg-white border border-slate-200"
          }`}
        >
          {/* Theme Toggle */}
          <div className="mb-6">
            <p
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                isDark ? "text-white/40" : "text-slate-400"
              }`}
            >
              Display Theme
            </p>
            <div
              className={`flex rounded-xl p-1 ${
                isDark ? "bg-white/5" : "bg-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === "dark"
                    ? isDark
                      ? "bg-primary text-white shadow"
                      : "bg-blue-600 text-white shadow"
                    : isDark
                    ? "text-white/50 hover:text-white/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === "light"
                    ? "bg-white text-slate-900 shadow border border-slate-200"
                    : isDark
                    ? "text-white/50 hover:text-white/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sun className="w-4 h-4" />
                Light Mode
              </button>
            </div>
            {theme === "light" && (
              <p
                className={`mt-2 text-xs ${
                  isDark ? "text-white/40" : "text-slate-400"
                }`}
              >
                White background, bold black letters, high-contrast borders.
              </p>
            )}
          </div>

          <hr
            className={`mb-6 ${isDark ? "border-white/10" : "border-slate-100"}`}
          />

          {/* Form */}
          <form onSubmit={handleStart} className="space-y-5">
            {/* Age */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? "text-white/40" : "text-slate-400"
                }`}
              >
                Age (7 – 17)
              </label>
              <input
                type="number"
                min={7}
                max={17}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium outline-none transition-colors ${
                  isDark
                    ? "bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-primary"
                    : "bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
              />
            </div>

            {/* Gender */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? "text-white/40" : "text-slate-400"
                }`}
              >
                Gender
              </label>
              <div className={`flex rounded-xl p-1 ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                      gender === g
                        ? isDark
                          ? "bg-primary text-white shadow"
                          : "bg-blue-600 text-white shadow"
                        : isDark
                        ? "text-white/50 hover:text-white/80"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Language toggles */}
            <div className="space-y-3">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-white/40" : "text-slate-400"
                }`}
              >
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
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors ${
                    isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked
                        ? isDark
                          ? "bg-primary border-primary"
                          : "bg-blue-600 border-blue-600"
                        : isDark
                        ? "border-white/20"
                        : "border-slate-300"
                    }`}
                    onClick={() => onChange(!checked)}
                  >
                    {checked && (
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
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
                  <span className={`text-sm ${isDark ? "text-white/70" : "text-slate-600"}`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {/* Disclaimer */}
            <div
              className={`flex gap-3 rounded-lg p-3 text-xs leading-relaxed ${
                isDark
                  ? "bg-amber-500/10 text-amber-300/70"
                  : "bg-amber-50 text-amber-700 border border-amber-100"
              }`}
            >
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
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                isDark
                  ? "bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                  : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              }`}
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
