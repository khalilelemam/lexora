import { SupportedHardware } from '@/features/test/components';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Supported Hardware | Lexora',
  description: 'View the list of compatible eye tracking devices for Lexora.',
};

export default function SupportedHardwarePage() {
  return (
    <main className="min-h-screen bg-[#f3edd7] py-10">
      <SupportedHardware />
    </main>
  );
}
