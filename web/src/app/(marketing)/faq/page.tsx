import type { Metadata } from 'next';
import { Camera, HelpCircle, Monitor, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Lexora dyslexia screening, eye tracking, privacy, and technical requirements.',
};

const faqs: { group: string; items: { question: string; answer: string }[] }[] = [
  {
    group: 'Screening',
    items: [
      {
        question: 'What is Lexora?',
        answer:
          'Lexora is a web-based dyslexia risk screening platform. It studies gaze behavior while a child reads, then turns fixation and movement patterns into a risk-level assessment.',
      },
      {
        question: 'Is Lexora a diagnosis?',
        answer:
          'No. Lexora is a screening and research tool. It can point to risk patterns, but results should be interpreted by qualified educational or healthcare professionals.',
      },
      {
        question: 'How long does a screening take?',
        answer:
          'A typical session takes about five minutes: calibration first, then reading tasks, then results.',
      },
    ],
  },
  {
    group: 'Tracking modes',
    items: [
      {
        question: 'What is the difference between Tobii and webcam mode?',
        answer:
          'Tobii mode uses dedicated eye-tracking hardware for higher precision. Webcam mode uses the browser camera and face landmarks for a more accessible first-pass option.',
      },
      {
        question: 'What reading tasks are included?',
        answer:
          'Tobii mode uses syllables, pseudo-words, and meaningful text. Webcam mode uses a paragraph reading task to fit the available tracking precision.',
      },
      {
        question: 'Can I use a phone or tablet?',
        answer:
          'Screening is designed for desktop and laptop devices because gaze tracking needs a stable camera position, larger screen, and consistent viewing distance.',
      },
    ],
  },
  {
<<<<<<< HEAD
    group: 'Privacy',
    items: [
      {
        question: 'Does Lexora record video?',
        answer:
          'No. Webcam frames are processed in the browser to extract gaze-related coordinates. The landing test flow does not need stored video recordings.',
      },
      {
        question: 'Who controls child sessions?',
        answer:
          'A guardian, parent, or teacher supervises testing. Children do not create independent accounts for screening.',
      },
      {
        question: 'What should I do with a high-risk result?',
        answer:
          'Treat it as a signal to follow up, not a label. Share the report with an appropriate professional who can perform a full assessment.',
      },
    ],
=======
    question: 'What eye-tracking options are available?',
    answer:
      'Lexora supports two modes: (1) Tobii eye trackers for research-grade precision, and (2) webcam-based tracking using MediaPipe FaceLandmarker for accessibility — no special hardware required.',
  },
  {
    question: 'How accurate is webcam-based tracking?',
    answer:
      'Webcam tracking is less precise than dedicated eye trackers but still provides useful gaze features. Our calibration pipeline uses polynomial ridge regression with cross-validation to maximize accuracy from webcam data.',
  },
  {
    question: 'What happens to my camera data?',
    answer:
      'The camera feed stays in your browser and is processed locally with MediaPipe to extract gaze coordinates. No video recordings, screenshots, or face images are stored. If you are signed in and submit a test, Lexora may persist the derived ML response and, only when you opted in during registration, the raw gaze-coordinate JSON used for research workflows.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'For webcam mode — no, it works directly in your browser. For Tobii mode, you need to install the Lexora Tobii Service desktop application, which streams gaze data locally to the web app.',
  },
  {
    question: 'What browsers are supported?',
    answer:
      'Lexora works best in Chrome and Edge (Chromium-based browsers). Safari and Firefox have limited MediaPipe support which may affect webcam tracking quality.',
  },
  {
    question: 'How long does the screening take?',
    answer:
      'The full process takes approximately 5 minutes: calibration (~2 minutes) followed by the reading tasks (~3 minutes).',
  },
  {
    question: 'What reading tasks are included?',
    answer:
      'In Tobii mode, there are three tasks: syllable decoding, pseudo-word recognition, and meaningful text comprehension. In webcam mode, a single paragraph reading task is used to optimize for the available tracking precision.',
  },
  {
    question: 'Can I use Lexora on a phone or tablet?',
    answer:
      'Lexora requires a desktop or laptop computer with a screen large enough for accurate gaze tracking. Mobile devices are not supported due to screen size and camera positioning limitations.',
>>>>>>> origin/main
  },
];

const HIGHLIGHTS = [
  { icon: Monitor, label: 'Tobii supported' },
  { icon: Camera, label: 'Webcam option' },
  { icon: ShieldCheck, label: 'Guardian-led' },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#e3dcc2] text-[#1b2021]">
      <section className="relative overflow-hidden px-5 pt-32 pb-16 md:px-8 md:pt-40">
        <div className="absolute right-0 bottom-0 h-72 w-72 translate-x-20 translate-y-20 rounded-full bg-[#a6a867]/45" />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-black tracking-[0.32em] text-[#51513d] uppercase">
              Questions
            </p>
            <h1 className="text-5xl leading-[0.95] font-black text-balance md:text-7xl">
              The practical answers before a test starts.
            </h1>
          </div>
          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[12px_12px_0_rgba(81,81,61,.12)]">
            <HelpCircle className="mb-8 h-9 w-9 text-[#51513d]" />
            <p className="text-lg leading-8 text-[#1b2021]/68">
              Lexora is built for supervised screening. These answers focus on what a guardian,
              teacher, or researcher needs to know before using Tobii or webcam mode.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 bg-[#a6a867] px-3 py-2 text-xs font-black uppercase"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8">
          {faqs.map((group) => (
            <section key={group.group} className="grid gap-5 lg:grid-cols-[15rem_1fr]">
              <h2 className="text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">
                {group.group}
              </h2>
              <div className="grid gap-px overflow-hidden border border-[#51513d]/18 bg-[#51513d]/18">
                {group.items.map((faq, index) => (
                  <article
                    key={faq.question}
                    className="grid gap-5 bg-[#f3edd7] p-6 md:grid-cols-[4rem_1fr]"
                  >
                    <div className="font-mono text-sm font-black text-[#51513d]">0{index + 1}</div>
                    <div>
                      <h3 className="text-2xl font-black">{faq.question}</h3>
                      <p className="mt-3 leading-7 text-[#1b2021]/66">{faq.answer}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
