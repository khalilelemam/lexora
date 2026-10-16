'use client';

import { useState } from 'react';
import { Play, Sparkles, Video, Volume2, ShieldCheck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoExplainerSectionProps {
  /** Optional video embed URL (YouTube, Vimeo, or direct MP4). If empty, placeholder is shown */
  videoUrl?: string;
}

export function VideoExplainerSection({ videoUrl }: VideoExplainerSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section id="video" className="relative py-20 px-6 sm:px-8 border-b border-[#51513d]/15 bg-[#e3dcc2]/35" dir="rtl">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#51513d]/20 bg-[#f3edd7] px-3.5 py-1 text-xs font-bold text-[#51513d] mb-3">
            <Video className="h-3.5 w-3.5 text-[#8b6f25]" />
            فيديو توضيحي وإرشادي
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1b2021]">
            شاهد كيف تشارك مع طفلك خطوة بخطوة
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#1b2021]/75 leading-relaxed">
            فيديو تعريفي يشرح أهمية تتبع حركة العين في فهم مهارات القراءة، وكيفية تجهيز الكاميرا ومساعدة طفلك أثناء الاختبار التجريبي.
          </p>
        </div>

        {/* Video Frame / Placeholder Container */}
        <div className="relative aspect-video w-full overflow-hidden border-2 border-[#51513d] bg-[#1b2021] shadow-[12px_12px_0_rgba(81,81,61,.18)]">
          {videoUrl && isPlaying ? (
            <iframe
              src={videoUrl}
              title="فيديو توضيحي لمبادرة ليكسورا"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center select-none bg-[radial-gradient(ellipse_at_center,_rgba(81,81,61,0.6)_0%,_rgba(27,32,33,0.95)_100%)]">
              {/* Decorative Gaze Overlay in Placeholder */}
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#e3dc95_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* Play Button Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (videoUrl) {
                    setIsPlaying(true);
                  } else {
                    alert('سيتم رفع الفيديو التوضيحي قريباً مع انطلاق الحملة الإعلامية على وسائل التواصل الاجتماعي!');
                  }
                }}
                className="group relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 border-[#e3dcc2] bg-[#51513d]/90 text-[#e3dcc2] shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#a6a867] hover:text-[#1b2021] cursor-pointer"
                aria-label="تشغيل الفيديو"
              >
                <div className="absolute inset-0 rounded-full bg-[#a6a867]/30 animate-ping opacity-75" />
                <Play className="h-8 w-8 sm:h-10 sm:w-10 ml-1 transition-transform group-hover:scale-110" />
              </button>

              <div className="relative z-10 mt-6 max-w-lg">
                <span className="inline-block rounded border border-[#e3dc95]/30 bg-[#e3dc95]/10 px-3 py-1 text-xs font-bold text-[#e3dc95] mb-2">
                  فيديو الحملة الترويجية والإرشادية
                </span>
                <p className="text-lg sm:text-xl font-bold text-[#f3edd7]">
                  (مكان الفيديو - سيتم إدراجه فور الانتهاء من تصويره ومشاركته على السوشيال ميديا)
                </p>
                <p className="mt-2 text-xs text-[#e3dcc2]/70">
                  انقر للمشاهدة أو تابع الإرشادات أدناه لتجربة الاختبار مباشرة مع طفلك.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3 Quick Preparation Tips for Parents */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-5 shadow-sm text-right">
            <div className="flex items-center gap-2 mb-2 text-[#51513d] font-bold text-sm">
              <CheckCircle className="h-4 w-4 text-green-700" />
              1. مسافة مريحة من الشاشة
            </div>
            <p className="text-xs text-[#1b2021]/70 leading-relaxed">
              اجعل الطفل يجلس على بعد ذراع تقريباً من الشاشة والكاميرا في مستوى عينيه.
            </p>
          </div>

          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-5 shadow-sm text-right">
            <div className="flex items-center gap-2 mb-2 text-[#51513d] font-bold text-sm">
              <CheckCircle className="h-4 w-4 text-green-700" />
              2. إضاءة واضحة بدون وهج
            </div>
            <p className="text-xs text-[#1b2021]/70 leading-relaxed">
              تأكد من إضاءة وجه الطفل بشكل جيد وتجنب وجود نافذة قوية أو مصدر ضوء ساطع خلفه.
            </p>
          </div>

          <div className="border border-[#51513d]/18 bg-[#f3edd7] p-5 shadow-sm text-right">
            <div className="flex items-center gap-2 mb-2 text-[#51513d] font-bold text-sm">
              <CheckCircle className="h-4 w-4 text-green-700" />
              3. قراءة طبيعية بصوت مسموع
            </div>
            <p className="text-xs text-[#1b2021]/70 leading-relaxed">
              شجّع طفلك على قراءة الكلمات والقصة بصوته المعتاد وبكل أريحية دون أي ضغط.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
