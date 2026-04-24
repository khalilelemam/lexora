"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SessionStartResponse = {
  sessionId?: string;
  error?: string;
};

export default function EnTestStartPage() {
  const router = useRouter();
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
        }),
      });

      const payload = (await response.json()) as SessionStartResponse;
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Unable to start the test.");
      }

      router.push(`/gamified-test/test/en/${payload.sessionId}`);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Unexpected error.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">English Test (No DB)</h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter participant demographics, then start the assessment.
      </p>

      <form onSubmit={handleStart} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Age (7-17)
          <input
            type="number"
            min={7}
            max={17}
            value={age}
            onChange={(event) => setAge(Number(event.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          Gender
          <select
            value={gender}
            onChange={(event) =>
              setGender(event.target.value === "female" ? "female" : "male")
            }
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nativeLang}
            onChange={(event) => setNativeLang(event.target.checked)}
          />
          Native language is English
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={otherLang}
            onChange={(event) => setOtherLang(event.target.checked)}
          />
          Speaks another language too
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? "Starting..." : "Start English Test"}
        </button>
      </form>
    </main>
  );
}
