import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Brain,
  Camera,
  ChartNoAxesCombined,
  ClipboardCheck,
  Eye,
  LineChart,
  Monitor,
  MousePointer2,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingStage } from './_components/landing-stage';
import { GazeTrailDemo } from './_components/gaze-trail-demo';
import { DownloadSection } from './_components/download-section';

const SIGNALS = [
  {
    icon: Eye,
    title: 'Fixation portrait',
    copy: 'See where reading slows, where attention returns, and which words hold the gaze longest.',
  },
  {
    icon: Waves,
    title: 'Sweep rhythm',
    copy: 'Turn regressions, return sweeps, and line changes into a readable movement signature.',
  },
  {
    icon: Brain,
    title: 'Screening context',
    copy: 'Send compact gaze features into the model without making the session feel clinical or cold.',
  },
];

const MODES = [
  {
    icon: Monitor,
    title: 'Tobii Studio',
    label: 'Dedicated eye tracker',
    copy: 'A precise local setup for labs, schools, and supervised screening sessions.',
    href: '/test/tobii',
    className: 'bg-[#51513d] text-[#e3dcc2]',
  },
  {
    icon: Camera,
    title: 'Webcam Studio',
    label: 'No extra hardware',
    copy: 'A fast browser path using face and iris landmarks for accessible first-pass screening.',
    href: '/test/webcam',
    className: 'bg-[#a6a867] text-[#1b2021]',
  },
];

const WORKFLOW = [
  ['01', 'Set the room', 'Choose Tobii or webcam and run calibration in a calm full-screen flow.'],
  [
    '02',
    'Read with purpose',
    'Use syllables, pseudo-words, and passages to capture different reading behaviors.',
  ],
  [
    '03',
    'Map the gaze',
    'Translate timing, motion, and regression patterns into a structured screening signal.',
  ],
  [
    '04',
    'Review gently',
    'Replay the path and decide what support or professional follow-up should happen next.',
  ],
];

const BADGES = [
  { icon: ShieldCheck, label: 'Local-first' },
  { icon: LineChart, label: 'Replayable' },
  { icon: Activity, label: 'ML-ready' },
  { icon: MousePointer2, label: 'Learner-friendly' },
];

const PRODUCT_BEATS = [
  {
    icon: ShieldCheck,
    title: 'Guardian-supervised',
    copy: 'Children do not manage accounts. Parents and teachers control profiles, sessions, retakes, reports, and follow-up.',
  },
  {
    icon: ScanEye,
    title: 'Calibrated before reading',
    copy: 'The test starts with a 15-point gaze map so the reading area is measured before the child begins.',
  },
  {
    icon: ClipboardCheck,
    title: 'Three-part Tobii test',
    copy: 'Syllables, pseudo-words, and meaningful text reveal different parts of the reading process.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Risk, confidence, replay',
    copy: 'The result pairs an ML risk signal with confidence, recommendations, and gaze replay context.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#e3dcc2] text-[#1b2021]">
      <LandingStage />

      <section id="signal" className="relative overflow-hidden px-5 py-20 md:px-8 md:py-28">
        <div className="absolute top-0 right-0 left-0 h-px bg-[#51513d]/18" />
        <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-[#e3dc95]/45 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">
              Reading map
            </p>
            <h2 className="max-w-xl text-4xl leading-tight font-black text-balance md:text-6xl">
              Soft colors, sharp signals.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#1b2021]/68">
              The palette stays warm and academic, while the interface still feels alive. Lexora
              shows gaze movement as something a parent, teacher, or researcher can actually
              discuss.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="border border-[#51513d]/18 bg-[#e3dcc2]/80 p-3 shadow-[12px_12px_0_rgba(81,81,61,.14)]">
              <GazeTrailDemo />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {SIGNALS.map((signal) => {
                const Icon = signal.icon;
                return (
                  <article
                    key={signal.title}
                    className="border border-[#51513d]/18 bg-[#f3edd7]/70 p-5 shadow-[8px_8px_0_rgba(81,81,61,.1)]"
                  >
                    <Icon className="mb-5 h-6 w-6 text-[#51513d]" />
                    <h3 className="text-lg font-black">{signal.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#1b2021]/64">{signal.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="modes" className="bg-[#1b2021] px-5 py-20 text-[#e3dcc2] md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
                Two calm launch lanes
              </p>
              <h2 className="max-w-2xl text-4xl leading-tight font-black text-balance md:text-6xl">
                Choose the instrument. Keep the experience human.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-[#e3dcc2]/68">
              Both paths share the same visual language: quiet confidence, readable steps, and a
              result screen that supports conversation instead of panic.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={mode.title}
                  href={mode.href}
                  className={`${mode.className} group relative overflow-hidden p-8 transition-transform hover:-translate-y-1`}
                >
                  <div className="absolute right-0 bottom-0 h-36 w-36 translate-x-10 translate-y-10 rounded-full bg-[#e3dc95]/28" />
                  <p className="mb-16 text-xs font-black tracking-[0.25em] uppercase opacity-70">
                    {mode.label}
                  </p>
                  <Icon className="mb-7 h-10 w-10" />
                  <h3 className="text-3xl font-black">{mode.title}</h3>
                  <p className="mt-4 max-w-lg leading-7 opacity-75">{mode.copy}</p>
                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-black tracking-[0.18em] uppercase">
                    Start screening
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">
                Screening choreography
              </p>
              <h2 className="text-4xl leading-tight font-black text-balance md:text-6xl">
                A simple path, designed with care.
              </h2>
              <p className="mt-6 max-w-md leading-7 text-[#1b2021]/66">
                The page uses the brand colors like paper, ink, and highlighter: grounded first,
                expressive where it helps the user move.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {BADGES.map((badge) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <span
                      key={badge.label}
                      className="inline-flex items-center gap-2 border border-[#51513d]/22 bg-[#f3edd7]/70 px-3 py-2 text-xs font-black uppercase"
                    >
                      <BadgeIcon className="h-4 w-4 text-[#51513d]" />
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-px overflow-hidden border border-[#51513d]/18 bg-[#51513d]/18 md:grid-cols-2">
              {WORKFLOW.map(([step, title, copy]) => (
                <article key={step} className="bg-[#e3dcc2] p-7">
                  <span className="font-mono text-sm font-black text-[#51513d]">{step}</span>
                  <h3 className="mt-7 text-2xl font-black">{title}</h3>
                  <p className="mt-4 leading-7 text-[#1b2021]/64">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#51513d] px-5 py-20 text-[#e3dcc2] md:px-8 md:py-28">
        <div className="absolute top-0 left-0 h-full w-24 bg-[#a6a867]/24" />
        <div className="absolute right-0 bottom-0 h-72 w-72 translate-x-20 translate-y-20 rounded-full bg-[#e3dc95]/16" />
        <div className="relative mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.74fr_1.26fr] md:items-start">
          <div>
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
              What the product does
            </p>
            <h2 className="text-4xl leading-tight font-black text-balance md:text-6xl">
              From a child&apos;s first fixation to a useful next step.
            </h2>
            <p className="mt-6 max-w-md leading-7 text-[#e3dcc2]/68">
              The page now mirrors the real flow: supervised setup, calibration, reading, model
              interpretation, and support after the result.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PRODUCT_BEATS.map((beat, index) => {
              const Icon = beat.icon;
              return (
                <article
                  key={beat.title}
                  className="group relative min-h-64 overflow-hidden border border-[#e3dcc2]/18 bg-[#1b2021]/16 p-6"
                >
                  <div className="absolute top-0 right-0 flex h-16 w-16 items-center justify-center bg-[#e3dc95] font-mono text-sm font-black text-[#1b2021]">
                    0{index + 1}
                  </div>
                  <Icon className="mb-16 h-8 w-8 text-[#e3dc95]" />
                  <h3 className="text-2xl font-black">{beat.title}</h3>
                  <p className="mt-4 leading-7 text-[#e3dcc2]/68">{beat.copy}</p>
                  <div className="absolute right-0 bottom-0 h-24 w-24 translate-x-10 translate-y-10 rounded-full bg-[#a6a867]/20 transition-transform group-hover:translate-x-8 group-hover:translate-y-8" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[14px_14px_0_rgba(81,81,61,.12)]">
            <div className="mb-8 flex items-center justify-between border-b border-[#51513d]/16 pb-4 text-xs font-black tracking-[0.24em] text-[#51513d] uppercase">
              <span>Future support layer</span>
              <span>Learning + games</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  'Reading mode',
                  'Line focus, narration speed, tap-to-hear words, and dyslexia-friendly preferences.',
                ],
                [
                  'Exercise engine',
                  'Syllable splitting, missing letters, phoneme matching, and adaptive difficulty.',
                ],
                ['Games', 'Sound matching, word builder, levels, streaks, and progress tracking.'],
                [
                  'Classrooms',
                  'Teacher-created profiles, parent claiming, assignments, and class-level analytics.',
                ],
              ].map(([title, copy]) => (
                <div key={title} className="bg-[#e3dcc2] p-5">
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#1b2021]/62">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">
              Beyond screening
            </p>
            <h2 className="text-4xl leading-tight font-black text-balance md:text-6xl">
              Not just detection. A path into practice.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#1b2021]/68">
              Lexora&apos;s bigger idea is to connect screening with support: reports for guardians,
              classroom visibility for teachers, and reading activities that adapt to the
              child&apos;s language and level.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 rounded-md bg-[#51513d] px-6 text-[#e3dcc2] hover:bg-[#1b2021]"
            >
              <Link href="#get-started">
                Start with screening
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <DownloadSection />

      <section id="get-started" className="bg-[#e3dc95] px-5 py-20 text-[#1b2021] md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-black tracking-[0.3em] uppercase">
              <Sparkles className="h-4 w-4" />
              Ready when you are
            </p>
            <h2 className="max-w-3xl text-4xl leading-tight font-black text-balance md:text-6xl">
              Open Lexora and map the reading signal.
            </h2>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-md bg-[#1b2021] px-6 text-[#e3dcc2]">
              <Link href="/test/webcam">
                Webcam
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-md border-[#1b2021]/35 bg-transparent px-6 font-bold text-[#1b2021] hover:bg-[#1b2021]/10"
            >
              <Link href="/test/tobii">Tobii service</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="about" className="px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 border-t border-[#51513d]/18 pt-12 md:grid-cols-[0.7fr_1.3fr]">
          <p className="text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">
            Research note
          </p>
          <p className="max-w-4xl text-lg leading-8 text-[#1b2021]/68">
            Lexora is a screening and research tool, not a clinical diagnosis. Its job is to make
            reading difficulty signals easier to notice, discuss, and follow up with qualified
            professionals.
          </p>
        </div>
      </section>
    </main>
  );
}
