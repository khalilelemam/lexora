'use client';

import Link from 'next/link';
import { Camera, ShieldCheck, Sparkles, Brain, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaitlistForm } from './waitlist-form';

export function WaitlistHero() {
  return (
    <section id="waitlist" className="relative pt-28 pb-20 px-6 sm:px-8 border-b border-[#51513d]/15 overflow-hidden" dir="rtl">
      {/* Background Subtle Gradient & Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-10 right-10 h-96 w-96 rounded-full bg-[#a6a867]/30 blur-[120px]" />
        <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-[#e3dc95]/40 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Right Column: Hero Content & Scientific Mission */}
          <div className="lg:col-span-7 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#51513d]/20 bg-[#f3edd7] px-4 py-1.5 text-xs font-bold text-[#51513d] shadow-sm mb-6">
              <Sparkles className="h-4 w-4 text-[#8b6f25]" />
              أول منصة بحثية عربية لتتبع القراءة بالذكاء الاصطناعي
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1b2021] leading-[1.25]">
              مستقبل تقييم القراءة وتتبع العين للأطفال باللغة العربية
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#1b2021]/80 leading-relaxed max-w-2xl">
              تستخدم ليكسورا كاميرا الويب لمعايرة وتتبع حركة العين بدقة متناهية أثناء القراءة. نهدف إلى سد الفجوة في المحتوى والبحث العربي وبناء أدوات ذكية ومبكرة لدعم كل طفل يواجه صعوبات في القراءة.
            </p>

            {/* Feature Highlights */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="flex items-center gap-3 border border-[#51513d]/14 bg-[#f3edd7]/70 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#51513d] text-[#e3dcc2]">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1b2021]">كاميرا الويب العادية</h4>
                  <p className="text-[11px] text-[#1b2021]/65">بدون الحاجة لأي أجهزة خارجية مكلفة</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border border-[#51513d]/14 bg-[#f3edd7]/70 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#51513d] text-[#e3dcc2]">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1b2021]">3 مراحل قراءة علمية</h4>
                  <p className="text-[11px] text-[#1b2021]/65">مقاطع صوتية، كلمات، وقصة هادفة</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border border-[#51513d]/14 bg-[#f3edd7]/70 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#51513d] text-[#e3dcc2]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1b2021]">خصوصية تامة 100%</h4>
                  <p className="text-[11px] text-[#1b2021]/65">معالجة فورية محلية بدون حفظ فيديوهات</p>
                </div>
              </div>

              <div className="flex items-center gap-3 border border-[#51513d]/14 bg-[#f3edd7]/70 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#51513d] text-[#e3dcc2]">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1b2021]">معايرة شبكية مخصصة</h4>
                  <p className="text-[11px] text-[#1b2021]/65">مطابقة شاشة القارئ لكل جلسة</p>
                </div>
              </div>
            </div>

            {/* Direct Test Callout */}
            <div className="mt-10 border border-[#51513d]/20 bg-[#e3dcc2]/60 p-5 max-w-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#51513d]">تريد تجربة تتبع العين فوراً؟</p>
                <p className="text-xs text-[#1b2021]/70 mt-0.5">يمكنك البدء باختبار تجريبي سريع مع طفلك الآن.</p>
              </div>
              <Link href="/test/webcam" className="shrink-0 w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-[#51513d] text-xs font-bold text-[#e3dcc2] shadow-[3px_3px_0_rgba(81,81,61,.18)] hover:bg-[#1b2021]"
                >
                  <Camera className="ml-1.5 h-3.5 w-3.5" />
                  ابدأ الاختبار التجريبي
                </Button>
              </Link>
            </div>
          </div>

          {/* Left Column: Waitlist Signup Form Card */}
          <div className="lg:col-span-5 w-full">
            <WaitlistForm />
          </div>
        </div>
      </div>
    </section>
  );
}
