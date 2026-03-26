"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Demographics, StudentWithAttempts } from "@/lib/types";

type Gender = Demographics["gender"];

type StudentsResponse = {
  students: StudentWithAttempts[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithAttempts[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(10);
  const [nativeLang, setNativeLang] = useState(true);
  const [otherLang, setOtherLang] = useState(false);

  async function loadStudents() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/students", { cache: "no-store" });
      const payload = (await response.json()) as StudentsResponse | { error?: string };

      if (!response.ok || !("students" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Unable to load students.");
      }

      setStudents(payload.students);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          demographics: { gender, age, nativeLang, otherLang },
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create student.");
      }

      setName("");
      await loadStudents();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  async function startAssessment(studentId: string) {
    setError(null);

    try {
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      const payload = (await response.json()) as { sessionId?: string; error?: string };
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Unable to start test.");
      }

      router.push(`/test/${payload.sessionId}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unexpected error.");
    }
  }

  return (
    <main className="min-h-screen bg-[#eef4f8] px-6 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                Students and Assessment History
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Add a student once, then start tests using saved demographic data.
              </p>
            </div>
            <Link href="/" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Back to Landing
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleCreateStudent}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">Add Student</h2>

            <div className="mt-4 grid gap-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Student name"
                  required
                />
              </div>

              <div>
                <label htmlFor="age" className="text-sm font-medium text-slate-700">
                  Age (7-17)
                </label>
                <input
                  id="age"
                  type="number"
                  min={7}
                  max={17}
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(event) => setGender(event.target.value as Gender)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={nativeLang}
                  onChange={(event) => setNativeLang(event.target.checked)}
                />
                <span className="text-sm text-slate-700">English is native language</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={otherLang}
                  onChange={(event) => setOtherLang(event.target.checked)}
                />
                <span className="text-sm text-slate-700">Speaks another language</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Student"}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Existing Students</h2>

            {loading ? <p className="mt-4 text-sm text-slate-600">Loading students...</p> : null}
            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

            {!loading && students.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No students yet. Add your first student from the form.
              </p>
            ) : null}

            <div className="mt-4 grid gap-4">
              {students.map((student) => (
                <article key={student.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{student.name}</h3>
                      <p className="text-sm text-slate-600">
                        Age {student.demographics.age} | {student.demographics.gender} | Native English: {student.demographics.nativeLang ? "Yes" : "No"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startAssessment(student.id)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Start New Test
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Previous Results
                    </p>

                    {student.attempts.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">No attempts yet.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {student.attempts.slice(0, 6).map((attempt) => (
                          <div key={attempt.sessionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="text-sm text-slate-700">
                              <span className="font-semibold">{new Date(attempt.startedAt).toLocaleDateString()}</span>
                              <span className="ml-2 text-slate-500">
                                {attempt.riskDetected === undefined
                                  ? "In progress"
                                  : attempt.riskDetected
                                    ? "Risk detected"
                                    : "No risk"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              {typeof attempt.probability === "number" ? (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                                  {(attempt.probability * 100).toFixed(1)}%
                                </span>
                              ) : null}
                              <Link
                                href={`/result/${attempt.sessionId}`}
                                className="font-semibold text-cyan-700 hover:text-cyan-600"
                              >
                                Open result
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
