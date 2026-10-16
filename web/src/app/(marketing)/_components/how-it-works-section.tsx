'use client';

import { Sparkles, Eye, Smile, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    step: '01',
    title: 'جلسة هادئة ومعايرة سريعة',
    desc: 'يجلس طفلك بارتياح أمام شاشة الحاسوب في مكان هادئ، ويتابع نقطة على الشاشة بعينيه لعدة ثوانٍ حتى تتعرف الكاميرا على اتجاه نظراته بدقة.',
    badge: 'دقيقة واحدة',
  },
  {
    step: '02',
    title: 'قراءة 3 فقرات قصيرة وممتعة',
    desc: 'يقرأ الطفل مجموعة من المقاطع الصوتية، تليها كلمات مصممة صوتياً، ثم نص قصصي قصير وممتع يناسب مرحلته العمرية دون أي ضغط أو اختبار درجات.',
    badge: 'دقيقتان',
  },
  {
    step: '03',
    title: 'مساهمة قيّمة في أبحاث القراءة',
    desc: 'تُحفظ بيانات حركة العين وسرعة الانتقال بين السطور بأمان وخصوصية تامة، لتكون حجر الأساس في تدريب أول نموذج ذكاء اصطناعي يفهم القراءة العربية.',
    badge: 'خصوصية كاملة',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-[#f3edd7] px-6 py-24 text-[#1b2021] md:px-12" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 border border-[#51513d]/20 bg-[#e3dcc2]/70 px-4 py-1.5 text-xs font-bold text-[#51513d]">
            <Smile className="h-4 w-4" />
            تجربة لطيفة ومريحة للأطفال
          </div>
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl text-[#1b2021]">
            كيف تجري تجربة القراءة مع طفلك؟
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#1b2021]/75">
            صممنا التجربة لتكون لعبة قراءة سريعة وبسيطة لا تتجاوز 3 دقائق، دون أي اختبارات معقدة أو أحكام، فقط نراقب النظرات الطبيعية أثناء القراءة.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="relative flex flex-col justify-between border border-[#51513d]/20 bg-[#e3dcc2] p-8 shadow-[8px_8px_0_rgba(81,81,61,.12)] transition-transform hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#51513d]/15 pb-4">
                  <span className="font-mono text-2xl font-black text-[#51513d]">{item.step}</span>
                  <span className="rounded-full bg-[#f3edd7] px-3 py-1 text-xs font-bold text-[#51513d]">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-black text-[#1b2021]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#1b2021]/75 font-medium">{item.desc}</p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-[#51513d]">
                <CheckCircle className="h-4 w-4 text-[#a6a867]" />
                مريح وبسيط عبر كاميرا الويب
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <Link href="/waitlist">
            <Button size="lg" className="h-12 bg-[#51513d] text-[#e3dcc2] px-8 font-bold hover:bg-[#1b2021]">
              <Sparkles className="ml-2 h-4 w-4 text-[#e3dc95]" />
              انضم إلى قائمة الانتظار أولاً
            </Button>
          </Link>
          <Link href="/test/webcam">
            <Button size="lg" variant="outline" className="h-12 border-[#51513d]/30 font-bold px-7">
              <Eye className="ml-2 h-4 w-4 text-[#51513d]" />
              أو خُض تجربة القراءة مباشرة (3 دقائق)
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
