import Link from "next/link";

const pillars = [
  "Evidence-informed screening flow",
  "Gamified tasks with 32-question progression",
  "Teacher dashboard with student history",
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f8fb] text-slate-900">
      <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-[#00b7a8]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#0ea5e9]/20 blur-3xl" />

      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-14">
        <div className="rounded-4xl border border-slate-200/80 bg-white/85 p-8 shadow-[0_20px_70px_rgba(0,30,70,0.14)] backdrop-blur md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            English Dyslexia Screening
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
            Detect earlier, support faster, and track every learner with clarity.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
            This platform is inspired by evidence-based ideas used in tools such
            as Lexplore, Change Dyslexia, and Lexercise, adapted for your local
            workflow with a teacher-first dashboard and model-backed risk
            screening.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {pillars.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0b5f59]"
            >
              Go To Login
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Open Dashboard
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Current auth is placeholder only. Google sign-in and one-time email
            token can be integrated later without changing page flow.
          </p>
        </div>
      </section>
    </main>
  );
}
