import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Lexora — dyslexia screening, eye tracking, privacy, and technical requirements.',
};

const faqs: { question: string; answer: string }[] = [
  {
    question: 'What is Lexora?',
    answer:
      'Lexora is a web-based dyslexia screening tool that uses eye-tracking technology to analyze reading patterns. It identifies gaze features commonly associated with dyslexia, such as excessive regressions, prolonged fixations, and irregular saccade patterns.',
  },
  {
    question: 'Is Lexora a diagnostic tool?',
    answer:
      'No. Lexora is a screening tool designed for research purposes. It provides a risk-level assessment, not a clinical diagnosis. Results should always be interpreted by qualified professionals such as educational psychologists.',
  },
  {
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
  },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="bg-background min-h-screen pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-4 text-4xl font-bold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-10">
          Common questions about Lexora, eye tracking, privacy, and technical requirements.
        </p>

        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b pb-8 last:border-b-0">
              <h2 className="mb-3 text-lg font-semibold">{faq.question}</h2>
              <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
