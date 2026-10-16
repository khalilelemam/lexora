'use client';

import { BookOpen, Layers, Sparkles, Brain, ScanEye, Check } from 'lucide-react';

export function MethodologySection() {
  const tasks = [
    {
      num: '01',
      title: 'قراءة المقاطع الصوتية (Syllables)',
      target: 'عزل فك الترميز الصوتي (Phonological Decoding)',
      desc: 'قراءة مقاطع صوتية مفتوحة ومغلقة ومشكلة. تهدف هذه المرحلة لقياس قدرة الطفل على تمييز الأصوات القصيرة والطويلة وحركة العين الأفقية دون أي مؤثرات سياقية أو لغوية.',
      details: ['حركات قصيرة وطويلة (با - دي - كو)', 'مقاطع ساكنة (تمْ - قلْ - سرْ)', 'مسافات مدروسة لتسجيل التثبيت بدقة'],
    },
    {
      num: '02',
      title: 'قراءة الكلمات غير الحقيقية (Pseudo-words)',
      target: 'التحويل الحرفي-الصوتي (Grapheme-to-Phoneme)',
      desc: 'كلمات مصطنعة تتبع القواعد الصرفية والصوتية العربية ولكنها لا توجد في المعجم. تجبر القارئ على التهجي الصوتي الدقيق بدلاً من الاعتماد على التخمين أو الذاكرة البصرية.',
      details: ['أوزان صرفية عربية صحيحة', 'تشكيل كامل لتجنب التخمين', 'قياس زمن التثبيت والقفزات العكسية'],
    },
    {
      num: '03',
      title: 'قراءة النص الهادف (Meaningful Text)',
      target: 'الانسيابية الطبيعية والفهم (Reading Fluency)',
      desc: 'قصة مشوقة ومترابطة من عدة أسطر متساوية. ترصد السلوك القرائي الطبيعي، وسرعة القراءة (WPM)، والقفزات الارتدادية التلقائية ومسارات انتقال العين بين الأسطر.',
      details: ['سرد قصصي شيق ملائم للطفل', 'تباعد أسطر مريح لكاميرا الويب', 'رصد شامل لقفزات الانتقال (Return Sweeps)'],
    },
  ];

  return (
    <section id="methodology" className="py-20 px-6 sm:px-8 border-b border-[#51513d]/15 bg-[#f3edd7]" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#51513d]/20 bg-[#e3dcc2]/60 px-3.5 py-1 text-xs font-bold text-[#51513d] mb-3">
            <Brain className="h-3.5 w-3.5 text-[#8b6f25]" />
            منهجية علمية مبنية على معايير عالمية
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1b2021]">
            المراحل الثلاث لتتبع القراءة (مستوحاة من ETDD70)
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#1b2021]/75 leading-relaxed">
            تم بناء الاختبار وفقاً لأحدث دراسات القياس البصري واللغوي (مثل قاعدة بيانات ETDD70 العالمية)، مع تكييفها بدقة لتناسب بنية اللغة العربية وحركات التشكيل.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div
              key={task.num}
              className="border border-[#51513d]/18 bg-[#e3dcc2]/40 p-6 flex flex-col justify-between shadow-[6px_6px_0_rgba(81,81,61,.1)] hover:shadow-[8px_8px_0_rgba(81,81,61,.14)] transition-all text-right"
            >
              <div>
                <span className="font-mono text-2xl font-black text-[#51513d]/40 block mb-2">
                  {task.num}
                </span>
                <h3 className="text-lg font-black text-[#1b2021] mb-1">
                  {task.title}
                </h3>
                <span className="inline-block text-[11px] font-bold text-[#8b6f25] bg-[#e3dc95]/40 px-2.5 py-0.5 rounded mb-3">
                  {task.target}
                </span>
                <p className="text-xs text-[#1b2021]/75 leading-relaxed mb-4">
                  {task.desc}
                </p>
              </div>

              <div className="border-t border-[#51513d]/15 pt-4 space-y-1.5">
                {task.details.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-[#51513d]">
                    <Check className="h-3 w-3 text-green-700 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
