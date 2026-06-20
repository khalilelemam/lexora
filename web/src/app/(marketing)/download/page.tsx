import { DownloadPageUI } from '../_components/download-page-ui';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download Lexora Tobii Service | Lexora',
  description:
    'Download the local service to stream raw gaze data with ultra-low latency directly to your browser.',
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen">
      <DownloadPageUI />
    </main>
  );
}
