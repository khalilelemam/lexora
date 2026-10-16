'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowLeft, Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

const ARABIC_SAMPLE_WORDS = ['قَرَأَ', 'نَظَرَ', 'فَهِمَ', 'سَلِيم', 'ضِيَاء', 'أَمَل'];

export function LandingStage() {
  const [pointer, setPointer] = useState({ x: 50, y: 42 });
  const { scrollYProgress } = useScroll();
  const logoY = useTransform(scrollYProgress, [0, 0.35], ['0%', '-8%']);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      setPointer({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  return (
    <section className="relative min-h-[92svh] overflow-hidden bg-[#e3dcc2] text-[#1b2021]" dir="rtl">
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.08) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Dynamic Radial Glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(227,220,149,.58), transparent 18rem), radial-gradient(circle at 10% 15%, rgba(166,168,103,.34), transparent 22rem), linear-gradient(115deg, rgba(255,255,255,.35) 0 28%, transparent 28% 100%)`,
        }}
      />

      <div className="absolute bottom-0 left-0 h-28 w-full bg-linear-to-t from-[#e3dcc2] to-transparent" />

      {/* Decorative Stamp */}
      <div className="absolute top-28 right-5 hidden h-24 w-24 border-8 border-[#1b2021] md:block" />

      {/* Floating Lab Card */}
      <motion.div
        className="pointer-events-none absolute top-24 left-[6%] hidden h-40 w-64 bg-[#51513d] shadow-[0_24px_44px_rgba(27,32,33,.26)] md:block"
        animate={{ y: [0, -10, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute -top-5 -left-5 grid h-20 w-20 place-items-center bg-[#a6a867] shadow-[8px_8px_0_rgba(27,32,33,.16)]">
          <LexoraLogo
            size="md"
            showText={false}
            className="[&_img]:brightness-0 [&_img]:saturate-[.55] [&_img]:sepia"
          />
        </div>
        <div className="flex h-full flex-col justify-end p-5 text-[#e3dcc2]">
          <LexoraLogo
            size="sm"
            className="mb-5 [&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
          />
          <div className="grid grid-cols-2 gap-3 text-[9px] leading-4 tracking-[0.14em] text-[#e3dcc2]/75 font-bold">
            <span>مختبر الأبحاث</span>
            <span>استكشاف الإمكانات</span>
            <span>تتبع حركة العين</span>
            <span>إشارات القراءة</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col justify-end px-5 pt-28 pb-14 md:px-8">
        <motion.div className="relative z-10 max-w-5xl" style={{ y: logoY }}>
          {/* Tagline Badge */}
          <motion.div
            className="mb-7 inline-flex items-center gap-3 border border-[#51513d]/25 bg-[#e3dcc2]/70 px-4 py-2 text-xs font-bold tracking-wide shadow-[6px_6px_0_rgba(81,81,61,.12)] backdrop-blur-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Sparkles className="h-4 w-4 text-[#51513d]" />
            مبادرة الذكاء الاصطناعي وتتبع حركة العين في القراءة العربية
          </motion.div>

          {/* Brand Heading */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            <LexoraLogo size="xl" className="mb-6" />
            <h1 className="text-6xl leading-[1.05] font-black tracking-tight text-balance sm:text-7xl lg:text-[7.5rem]">
              ليكسورا
            </h1>
            <p className="mt-4 text-xl tracking-wide text-[#51513d] font-bold sm:text-2xl">
              استكشف إمكانات طفلك القرائية بدقة وعناية
            </p>
          </motion.div>

          {/* Description */}
          <motion.p
            className="mt-7 max-w-2xl text-lg leading-8 text-[#1b2021]/78 sm:text-xl font-medium"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            بيئة تفاعلية هادئة ترصد مسار حركة العين أثناء القراءة عبر كاميرا الحاسوب العادية، لنساعد أولياء الأمور والمعلمين في فهم إيقاع القراءة وصعوبات التعلم وبناء مستقبل واعد لكل طفل.
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
          >
            <Button
              asChild
              size="lg"
              className="h-13 rounded-md bg-[#1b2021] px-8 text-base font-black text-[#e3dcc2] shadow-[6px_6px_0_rgba(81,81,61,.25)] hover:bg-[#51513d] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <Link href="/waitlist">
                <Sparkles className="ml-2 h-5 w-5 text-[#e3dc95]" />
                انضم إلى قائمة الانتظار
                <ArrowLeft className="mr-3 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-md border-[#51513d]/35 bg-[#e3dcc2]/70 px-7 text-base font-bold text-[#1b2021] hover:bg-[#e3dc95]/60 transition-colors"
            >
              <Link href="/test/webcam">
                <Camera className="ml-2.5 h-5 w-5 text-[#51513d]" />
                شارك في تجربة القراءة السريعة (3 دقائق)
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Interactive Gaze Simulation Preview on Left Side (RTL layout) */}
      <div className="absolute left-5 bottom-24 hidden w-lg max-w-[40vw] lg:block">
        <div className="relative h-80 overflow-hidden border border-[#e3dcc2]/30 bg-[#e3dcc2]/95 p-6 shadow-2xl shadow-[#1b2021]/30">
          <div className="mb-6 flex items-center justify-between text-xs font-black tracking-wider text-[#51513d]">
            <span>محاكاة مسار حركة العين</span>
            <span>معايرة دقيقة</span>
          </div>

          {/* Background Arabic Words */}
          <div className="relative z-10 space-y-4 text-2xl font-bold leading-none tracking-widest text-[#1b2021]/22 select-none">
            {ARABIC_SAMPLE_WORDS.map((word, index) => (
              <div key={word} className="flex justify-around">
                <span>{word}</span>
                <span>{ARABIC_SAMPLE_WORDS[(index + 2) % ARABIC_SAMPLE_WORDS.length]}</span>
                <span>{ARABIC_SAMPLE_WORDS[(index + 4) % ARABIC_SAMPLE_WORDS.length]}</span>
              </div>
            ))}
          </div>

          {/* Animated Gaze Trajectory Paths */}
          <div className="pointer-events-none absolute inset-0 origin-center scale-[0.85]">
            <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
              <motion.path
                d="M 460 92 C 376 68, 300 114, 208 82 S 72 96, 14 128 C 124 178, 288 118, 410 180 S 174 236, 40 212 C 156 280, 318 238, 446 302"
                fill="none"
                stroke="#51513d"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="8 11"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                }}
              />
              <motion.path
                d="M 444 126 C 346 102, 242 144, 112 110"
                fill="none"
                stroke="#a6a867"
                strokeWidth="10"
                strokeLinecap="round"
                opacity=".42"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>

            {/* Fixation Nodes */}
            {[
              [86, 25, 17, '#a6a867'],
              [66, 29, 12, '#e3dc95'],
              [48, 27, 21, '#51513d'],
              [27, 38, 14, '#a6a867'],
              [72, 58, 24, '#51513d'],
              [50, 66, 13, '#1b2021'],
              [24, 75, 19, '#a6a867'],
              [84, 82, 15, '#e3dc95'],
            ].map(([left, top, size, color], index) => (
              <motion.span
                key={`${left}-${top}`}
                className="absolute rounded-full border-2 border-[#e3dcc2]/80 mix-blend-multiply"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  backgroundColor: color as string,
                }}
                animate={{ scale: [0.86, 1.18, 0.86], opacity: [0.68, 1, 0.68] }}
                transition={{
                  duration: 1.9 + index * 0.12,
                  repeat: Infinity,
                  delay: index * 0.12,
                }}
              />
            ))}
          </div>

          {/* Three Stage Badges */}
          <div className="absolute right-5 bottom-5 left-5 z-20 grid grid-cols-3 gap-2 text-[10px] font-black tracking-wide text-center">
            <div className="bg-[#1b2021] px-2.5 py-2.5 text-[#e3dcc2]">المقاطع الصوتية</div>
            <div className="bg-[#51513d] px-2.5 py-2.5 text-[#e3dcc2]">الكلمات الوهمية</div>
            <div className="bg-[#a6a867] px-2.5 py-2.5 text-[#1b2021]">النص القصصي</div>
          </div>
        </div>
      </div>

      {/* Scroll Hint */}
      <motion.a
        href="#about"
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 text-xs font-bold tracking-wider text-[#1b2021]/70"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <ArrowDown className="h-4 w-4" />
        اكتشف المزيد عن المبادرة
      </motion.a>
    </section>
  );
}
