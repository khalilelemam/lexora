import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Camera, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingStage } from './_components/landing-stage';
import { VideoExplainerSection } from './_components/video-explainer-section';
import { HowItWorksSection } from './_components/how-it-works-section';
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
        {/* 1. Restored Animated Hero Section */}
        <LandingStage />

        {/* 2. Explainer Video Section (Placeholder for upcoming social media video) */}
        <VideoExplainerSection />

        {/* 3. Non-technical, Parent-Friendly "How it works" section */}
        <HowItWorksSection />

        {/* 4. Frequently Asked Questions */}
        <FaqSection />

        {/* 5. Closing Call to Action Section */}
        <section className="bg-[#51513d] px-6 py-20 text-[#e3dcc2] md:px-12 text-center" dir="rtl">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e3dc95]/30 bg-[#1b2021]/40 px-4 py-1.5 text-xs font-bold text-[#e3dc95] mb-6">
              <HeartHandshake className="h-4 w-4" />
              معاً نبني أول نموذج ذكاء اصطناعي لقراءة أطفالنا
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-balance leading-tight">
              كن شريكاً في رسم مستقبل تعليم القراءة في العالم العربي
            </h2>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#e3dcc2]/80 max-w-2xl mx-auto">
              سواء كنت ولي أمر يبحث عن رعاية طفله، أو معلماً أو أخصائياً، انضم لقائمة الانتظار وشارك في تطوير أدوات ذكية تراعي خصوصية لغتنا العربية.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/waitlist">
                <Button size="lg" className="h-13 bg-[#e3dc95] text-[#1b2021] hover:bg-[#a6a867] px-8 font-black text-base shadow-lg">
                  <Sparkles className="ml-2 h-5 w-5" />
                  انضم إلى قائمة الانتظار الآن
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/test/webcam">
                <Button size="lg" variant="outline" className="h-13 border-[#e3dcc2]/40 bg-transparent text-[#e3dcc2] hover:bg-[#e3dcc2]/15 px-7 font-bold text-base">
                  <Camera className="ml-2.5 h-5 w-5" />
                  تجربة قراءة سريعة مع طفلك
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
