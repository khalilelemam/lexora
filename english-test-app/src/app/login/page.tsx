"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    window.setTimeout(() => {
      if (!email.includes("@")) {
        setError("Enter a valid email address.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("teacherEmail", email);
      router.push("/dashboard");
    }, 500);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1420] px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(20,184,166,0.2),transparent_35%)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-3xl border border-white/10 bg-white/8 p-7 shadow-2xl backdrop-blur-xl md:grid-cols-2 md:p-10">
          <article>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Teacher Access
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-white">
              Sign in and continue to your student dashboard.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              This login is a temporary screen. In the next phase, we can connect
              Better Auth with Google sign-in and one-time email token.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              <li>Secure staff-only entry point</li>
              <li>Ready for OAuth provider upgrade</li>
              <li>No impact on current test engine</li>
            </ul>
          </article>

          <form onSubmit={handleLogin} className="rounded-2xl border border-white/15 bg-slate-950/45 p-6">
            <label htmlFor="email" className="text-sm font-semibold text-slate-200">
              School Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-slate-100 outline-none ring-cyan-300 focus:ring"
              placeholder="teacher@school.org"
              required
            />

            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/25 px-3 py-2 text-sm text-slate-200"
              >
                Google Sign-In (coming soon)
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/25 px-3 py-2 text-sm text-slate-200"
              >
                Email One-Time Token (coming soon)
              </button>
            </div>

            <Link href="/" className="mt-4 inline-block text-xs text-cyan-300 hover:text-cyan-200">
              Back to landing page
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}
