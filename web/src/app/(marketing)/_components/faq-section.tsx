'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'هل يحتاج الاختبار إلى كاميرا خاصة أو أجهزة باهظة الثمن؟',
      a: 'لا، على الإطلاق! تم تصميم خوارزميات ليكسورا للعمل مباشرة باستخدام كاميرا الويب العادية لأي حاسوب مكتبي أو لابتوب، دون الحاجة لشراء أي أجهزة تتبع باهظة الثمن.',
    },
    {
      q: 'هل يتم تسجيل أو حفظ فيديو لوجه طفلي؟',
      a: 'مطلقاً! نحن نلتزم بأعلى معايير الخصوصية والأمان. تتم معالجة معالم العين محلياً داخل المتصفح عبر الذكاء الاصطناعي، ويتم حفظ إحداثيات حركة العين الرقمية فقط على الخادم للأغراض البحثية دون تخزين أي صور أو تسجيلات مرئية للوجه.',
    },
    {
      q: 'هل يقدم هذا الاختبار تشخيصاً طبياً لعسر القراءة (Dyslexia)؟',
      a: 'الاختبار الحالي مصمم كمبادرة بحثية تفاعلية لجمع بيانات حركة العين وتدريب أول نموذج ذكاء اصطناعي عربي متخصص. لا يحل الاختبار محل الفحص الطبي أو التشخيص الإكلينيكي المعتمد من قبل أخصائي صعوبات التعلم.',
    },
    {
      q: 'كم يستغرق الاختبار التجريبي؟ وما المطلوب من طفلي؟',
      a: 'يستغرق الاختبار قرابة 3 دقائق فقط! يتضمن مرحلة معايرة سريعة (تتبع نقاط تظهر على الشاشة)، تليها قراءة 3 مقاطع (مقاطع صوتية قصيرة، كلمات غير حقيقية، وقصة قصيرة ممتعة).',
    },
    {
      q: 'ما المزايا التي أحصل عليها عند الانضمام لقائمة الانتظار؟',
      a: 'ستكون من أوائل الذين يحصلون على وصول حصري لمنصة ليكسورا بكامل مميزاتها فور إطلاقها، بالإضافة إلى تقارير استكشافية متقدمة لجلسات القراءة الخاصة بطفلك.',
    },
  ];

  return (
    <section id="faq" className="py-20 px-6 sm:px-8 border-b border-[#51513d]/15 bg-[#e3dcc2]/35" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#51513d]/20 bg-[#f3edd7] px-3.5 py-1 text-xs font-bold text-[#51513d] mb-3">
            <HelpCircle className="h-3.5 w-3.5 text-[#8b6f25]" />
            إجابات واضحة
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1b2021]">
            الأسئلة الشائعة
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#1b2021]/75">
            كل ما تود معرفته عن المبادرة، الخصوصية، وكيفية استخدام المنصة.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="border border-[#51513d]/18 bg-[#f3edd7] transition-all shadow-[4px_4px_0_rgba(81,81,61,.08)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-right font-bold text-[#1b2021] text-base hover:text-[#51513d] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-[#51513d] transition-transform duration-200 shrink-0 mr-3',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-[#1b2021]/75 border-t border-[#51513d]/10 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
