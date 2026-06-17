import type { Metadata } from 'next';
import TobiiTestScreen from '@/features/test/screens/tobii-test-screen';

export const metadata: Metadata = {
  title: 'Tobii Dyslexia Screening Test',
  description:
    "Run Lexora's guided Tobii eye-tracker screening flow with calibration, structured reading tasks, and gaze-based dyslexia risk analysis.",
  alternates: {
    canonical: '/test/tobii',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Tobii Dyslexia Screening Test | Lexora',
    description:
      'A guided Tobii-based dyslexia screening flow with calibration, reading tasks, and gaze analysis.',
    url: '/test/tobii',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Tobii Dyslexia Screening Test | Lexora',
    description:
      'A guided Tobii-based dyslexia screening flow with calibration, reading tasks, and gaze analysis.',
  },
};

export default function TobiiTestPage() {
  return <TobiiTestScreen />;
}
