import type { Metadata } from 'next';
import { BarChart3, Brain, Eye, Monitor, ShieldCheck, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Lexora, an eye-tracking dyslexia screening and learning support platform.',
};

const PRINCIPLES = [
  {
    icon: Eye,
    title: 'Read the movement',
    copy: 'Lexora studies fixations, regressions, return sweeps, and timing while a child reads.',
  },
  {
    icon: Monitor,
    title: 'Meet the room',
    copy: 'Use Tobii hardware for precise setups or webcam mode when access matters most.',
  },
  {
    icon: Brain,
    title: 'Explain the signal',
    copy: 'The ML result is framed as risk and confidence, not as a clinical diagnosis.',
  },
  {
    icon: ShieldCheck,
    title: 'Keep adults in charge',
    copy: 'Guardians supervise child profiles, test sessions, reports, retakes, and follow-up.',
  },
];

const TIMELINE = [
  ['Calibrate', 'A 20-point map aligns gaze with the reading area before the test begins.'],
  [
    'Read',
    'Tobii mode uses syllables, pseudo-words, and meaningful text. Webcam mode uses a paragraph task.',
  ],
  ['Analyze', 'Gaze samples become fixation features that the prediction service can interpret.'],
  ['Support', 'Reports, learning sessions, exercises, and games turn screening into a next step.'],
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#e3dcc2] text-[#1b2021]">
      <section className="relative overflow-hidden px-5 pt-32 pb-20 md:px-8 md:pt-40">
        <div className="absolute top-0 right-0 h-full w-[28vw] min-w-64 bg-[#51513d]" />
        <div className="absolute top-28 right-[10%] hidden h-32 w-32 bg-[#a6a867] shadow-[12px_12px_0_rgba(27,32,33,.18)] md:grid md:place-items-center">
          <Sparkles className="h-10 w-10 text-[#51513d]" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <p className="mb-5 text-xs font-black tracking-[0.32em] text-[#51513d] uppercase">
            About Lexora
          </p>
          <h1 className="max-w-4xl text-5xl leading-[0.95] font-black tracking-normal text-balance md:text-7xl">
            A warmer way to see reading difficulty early.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#1b2021]/68">
            Lexora is a web platform for dyslexia risk screening and learning support. It uses eye
            tracking, reading tasks, and machine learning to help guardians and educators notice
            patterns that deserve attention.
          </p>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">
              Why it exists
            </p>
            <h2 className="text-4xl leading-tight font-black text-balance md:text-6xl">
              Screening should feel clear, supervised, and reachable.
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-8 text-[#1b2021]/68">
            <p>
              Many children struggle with reading long before anyone has enough evidence to act.
              Lexora is designed to make early signals easier to collect and discuss, without
              turning the experience into a cold clinical machine.
            </p>
            <p>
              The system supports dedicated Tobii eye trackers and accessible webcam tracking. It
              guides the child through calibration and reading while the guardian stays in control.
              Results are meant to support professional follow-up, not replace it.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#1b2021] px-5 py-20 text-[#e3dcc2] md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
              Product principles
            </p>
            <h2 className="text-4xl leading-tight font-black text-balance md:text-6xl">
              Built around the test room, not the dashboard.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {PRINCIPLES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="border border-[#e3dcc2]/16 bg-[#51513d]/34 p-6"
                >
                  <Icon className="mb-12 h-8 w-8 text-[#e3dc95]" />
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[#e3dcc2]/66">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-7 shadow-[14px_14px_0_rgba(81,81,61,.12)]">
            <BarChart3 className="mb-16 h-10 w-10 text-[#51513d]" />
            <h2 className="text-4xl leading-tight font-black text-balance">
              The result is a conversation starter.
            </h2>
            <p className="mt-6 leading-7 text-[#1b2021]/66">
              Lexora reports risk level, confidence, and gaze context. It is a screening tool for
              research and support planning, not a medical diagnosis.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden border border-[#51513d]/18 bg-[#51513d]/18">
            {TIMELINE.map(([title, copy], index) => (
              <article key={title} className="grid grid-cols-[5rem_1fr] bg-[#e3dcc2]">
                <div className="bg-[#a6a867] p-5 font-mono text-sm font-black text-[#1b2021]">
                  0{index + 1}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-2 leading-7 text-[#1b2021]/64">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
