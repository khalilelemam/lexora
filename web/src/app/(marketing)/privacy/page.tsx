import type { Metadata } from 'next';
import { Camera, Database, EyeOff, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Lexora handles camera access, gaze data, child privacy, and research screening information.',
};

const PROMISES = [
  {
    icon: Camera,
    title: 'Camera stays purposeful',
    copy: 'Webcam mode uses camera access for gaze estimation during the active test flow.',
  },
  {
    icon: EyeOff,
    title: 'No video-first design',
    copy: 'The product is built around gaze coordinates and fixation features, not stored video recordings.',
  },
  {
    icon: UserRoundCheck,
    title: 'Guardian-led sessions',
    copy: 'Children are supervised by guardians, parents, or teachers. Child accounts are not independent login identities.',
  },
  {
    icon: LockKeyhole,
    title: 'Sensitive access is limited',
    copy: 'Where guardian or claim information is needed, it should be collected only for a clear purpose.',
  },
];

const DATA_ROWS = [
  ['Gaze samples', 'Screen x/y coordinates and timestamps captured during reading.'],
  ['Screen metadata', 'Display size and normalized coordinates used to interpret gaze correctly.'],
  ['Prediction output', 'Risk level, probability, confidence, and derived fixation context.'],
  ['Guardian context', 'Profile and supervision information needed to run and review child sessions.'],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#e3dcc2] text-[#1b2021]">
      <section className="relative overflow-hidden px-5 pt-32 pb-20 md:px-8 md:pt-40">
        <div className="absolute top-0 right-0 h-full w-[30vw] min-w-64 bg-[#51513d]" />
        <div className="absolute top-32 right-[11%] hidden h-36 w-36 bg-[#a6a867] shadow-[12px_12px_0_rgba(27,32,33,.18)] md:grid md:place-items-center">
          <ShieldCheck className="h-12 w-12 text-[#51513d]" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <p className="mb-5 text-xs font-black tracking-[0.32em] text-[#51513d] uppercase">
            Privacy
          </p>
          <h1 className="max-w-4xl text-5xl leading-[0.95] font-black text-balance md:text-7xl">
            Designed for children, supervised by adults.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#1b2021]/68">
            Lexora handles reading and gaze information with a narrow purpose: support supervised
            dyslexia risk screening and learning follow-up. This page explains what the product
            uses, what it avoids, and why.
          </p>
          <p className="mt-5 text-sm font-bold tracking-[0.18em] text-[#51513d] uppercase">
            Last updated: May 2026
          </p>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {PROMISES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="border border-[#51513d]/18 bg-[#f3edd7] p-6">
                <Icon className="mb-12 h-8 w-8 text-[#51513d]" />
                <h2 className="text-xl font-black">{item.title}</h2>
                <p className="mt-4 text-sm leading-6 text-[#1b2021]/64">{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#1b2021] px-5 py-20 text-[#e3dcc2] md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
              What data means here
            </p>
            <h2 className="text-4xl leading-tight font-black text-balance md:text-6xl">
              Gaze data is not a face recording.
            </h2>
            <p className="mt-6 max-w-md leading-7 text-[#e3dcc2]/68">
              During screening, Lexora cares about where gaze lands on the screen and how long it
              stays there. That information is used to produce a risk signal and visual context for
              the supervising adult.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden border border-[#e3dcc2]/16 bg-[#e3dcc2]/16">
            {DATA_ROWS.map(([name, copy]) => (
              <article key={name} className="grid gap-4 bg-[#51513d] p-6 md:grid-cols-[12rem_1fr]">
                <h3 className="font-black">{name}</h3>
                <p className="leading-7 text-[#e3dcc2]/72">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr]">
          <PolicyBlock title="Camera and webcam mode" icon={<Camera className="h-8 w-8" />}>
            Webcam mode requests camera permission only for the active screening flow. The camera
            feed is used to estimate gaze through browser-based face and iris landmarks. Lexora does
            not need to store video recordings to perform this screening experience.
          </PolicyBlock>

          <PolicyBlock title="Tobii helper service" icon={<Database className="h-8 w-8" />}>
            Tobii mode uses a local helper service to stream gaze data from supported hardware to
            the web app. This enables precise tracking while keeping the device connection local to
            the screening machine.
          </PolicyBlock>

          <PolicyBlock title="Children and guardians" icon={<UserRoundCheck className="h-8 w-8" />}>
            Lexora is designed for guardian-supervised use. Parents and teachers manage child
            profiles, test initiation, retakes, and report review. Children should not be asked to
            manage privacy decisions alone.
          </PolicyBlock>

          <PolicyBlock title="Research and diagnosis" icon={<ShieldCheck className="h-8 w-8" />}>
            Lexora is a screening and research tool. Results are not a clinical diagnosis. If a
            result indicates risk, it should be discussed with qualified professionals for proper
            assessment and support planning.
          </PolicyBlock>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-7xl border border-[#51513d]/18 bg-[#e3dc95] p-7">
          <h2 className="text-3xl font-black">Questions or data requests</h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#1b2021]/70">
            If you have questions about Lexora&apos;s privacy approach, use the project repository
            or contact the team managing your screening or research session. Any formal study using
            Lexora may also provide separate consent terms.
          </p>
        </div>
      </section>
    </main>
  );
}

function PolicyBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="border border-[#51513d]/18 bg-[#f3edd7] p-7 shadow-[10px_10px_0_rgba(81,81,61,.1)]">
      <div className="mb-14 text-[#51513d]">{icon}</div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-4 leading-7 text-[#1b2021]/66">{children}</p>
    </article>
  );
}
