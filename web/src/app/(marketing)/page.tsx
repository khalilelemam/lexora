import type { Metadata } from 'next';
import { WaitlistHero } from './_components/waitlist-hero';
import { VideoExplainerSection } from './_components/video-explainer-section';
import { MethodologySection } from './_components/methodology-section';
import { FaqSection } from './_components/faq-section';

export const metadata: Metadata = {
  title: 'ليكسورا (Lexora) | قائمة الانتظار ومبادرة أبحاث القراءة وتتبع العين للأطفال',
  description:
    'انضم لقائمة الانتظار لأول منصة عربية تقيس وتتبع حركة العين أثناء القراءة عبر كاميرا الويب لدعم مهارات القراءة والكشف المبكر بالذكاء الاصطناعي.',
  keywords: [
    'تتبع العين',
    'صعوبات القراءة',
    'عسر القراءة',
    'الدسلكسيا',
    'ذكاء اصطناعي عربي',
    'كاميرا الويب',
    'قائمة انتظار',
    'Lexora',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ليكسورا (Lexora) | مبادرة أبحاث القراءة وتتبع العين للأطفال',
    description:
      'تقييم حركة العين والقراءة للأطفال باللغة العربية عبر كاميرا الويب. انضم لقائمة الانتظار وشارك في الاختبار التجريبي.',
    url: '/',
    type: 'website',
  },
};

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#e3dcc2] text-[#1b2021]">
      <main className="flex-1">
        {/* 1. Hero Section with Integrated Waitlist Form */}
        <WaitlistHero />

        {/* 2. Explainer Video Section (Placeholder for social media video) */}
        <VideoExplainerSection />

        {/* 3. Research Methodology (ETDD70 Standard 3 Tasks: Syllables, Pseudo-words, Meaningful Text) */}
        <MethodologySection />

        {/* 4. Frequently Asked Questions */}
        <FaqSection />
      </main>
    </div>
  );
}
