import type { Metadata } from 'next';
import { TobiiTestClient } from './client';

export const metadata: Metadata = {
  title: 'Tobii Eye Tracker Test — Lexora',
  description: 'Screen for dyslexia indicators using your Tobii eye tracker.',
};

export default function TobiiTestPage() {
  return <TobiiTestClient />;
}
