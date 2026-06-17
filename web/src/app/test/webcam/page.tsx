import type { Metadata } from 'next';
import WebcamTestScreen from '@/features/test/screens/webcam-test-screen';

export const metadata: Metadata = {
  title: 'Webcam Dyslexia Screening Test',
  description:
    "Run Lexora's webcam-based dyslexia screening flow with calibration, reading tasks, and ML-powered gaze analysis.",
  alternates: {
    canonical: '/test/webcam',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Webcam Dyslexia Screening Test | Lexora',
    description:
      'A guided webcam-based dyslexia screening flow with calibration, reading tasks, and gaze analysis.',
    url: '/test/webcam',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Webcam Dyslexia Screening Test | Lexora',
    description:
      'A guided webcam-based dyslexia screening flow with calibration, reading tasks, and gaze analysis.',
  },
};

export default function WebcamTestPage() {
  return <WebcamTestScreen />;
}
