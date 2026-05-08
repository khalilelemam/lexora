'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, Camera, Monitor, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

const WORDS = ['ba', 'dremfil', 'field', 'sna', 'glopwed', 'sunlight'];

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
    <section className="relative min-h-[92svh] overflow-hidden bg-[#e3dcc2] text-[#1b2021]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.08) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(227,220,149,.58), transparent 18rem), radial-gradient(circle at 10% 15%, rgba(166,168,103,.34), transparent 22rem), linear-gradient(115deg, rgba(255,255,255,.35) 0 28%, transparent 28% 100%)`,
        }}
      />

      <div className="absolute bottom-0 left-0 h-28 w-full bg-gradient-to-t from-[#e3dcc2] to-transparent" />

      <div className="absolute top-28 left-5 hidden h-24 w-24 border-8 border-[#1b2021] md:block" />
      <motion.div
        className="pointer-events-none absolute top-24 right-[6%] hidden h-40 w-64 bg-[#51513d] shadow-[0_24px_44px_rgba(27,32,33,.26)] md:block"
        animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute -top-5 -right-5 grid h-20 w-20 place-items-center bg-[#a6a867] shadow-[8px_8px_0_rgba(27,32,33,.16)]">
          <LexoraLogo
            size="md"
            showText={false}
            className="[&_img]:brightness-0 [&_img]:sepia [&_img]:saturate-[.55]"
          />
        </div>
        <div className="flex h-full flex-col justify-end p-5 text-[#e3dcc2]">
          <LexoraLogo
            size="sm"
            className="mb-5 [&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
          />
          <div className="grid grid-cols-2 gap-3 text-[9px] leading-4 tracking-[0.18em] uppercase text-[#e3dcc2]/72">
            <span>Lexora Lab</span>
            <span>Map Potential</span>
            <span>Gaze Studio</span>
            <span>Reading Signal</span>
          </div>
        </div>
      </motion.div>

      <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col justify-end px-5 pt-28 pb-14 md:px-8">
        <motion.div className="relative z-10 max-w-5xl" style={{ y: logoY }}>
          <motion.div
            className="mb-7 inline-flex items-center gap-3 border border-[#51513d]/25 bg-[#e3dcc2]/70 px-3 py-2 text-xs font-semibold tracking-[0.28em] uppercase shadow-[6px_6px_0_rgba(81,81,61,.12)] backdrop-blur-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Sparkles className="h-4 w-4 text-[#51513d]" />
            Eye-tracking dyslexia screening
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            <LexoraLogo size="xl" className="mb-6" />
            <h1 className="text-6xl leading-[0.84] font-black tracking-[0.06em] text-balance sm:text-8xl lg:text-[9rem]">
              LEXORA
            </h1>
            <p className="mt-5 text-xl tracking-[0.34em] uppercase text-[#51513d] sm:text-2xl">
              Map your potential
            </p>
          </motion.div>

          <motion.p
            className="mt-8 max-w-2xl text-lg leading-8 text-[#1b2021]/72 sm:text-xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            A warm, visual screening workspace that turns Tobii or webcam gaze patterns into clear
            reading signals for families, educators, and researchers.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
          >
            <Button
              asChild
              size="lg"
              className="h-12 rounded-md bg-[#1b2021] px-6 font-bold text-[#e3dcc2] hover:bg-[#51513d]"
            >
              <Link href="/test/webcam">
                <Camera className="h-5 w-5" />
                Start Webcam
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-md border-[#51513d]/35 bg-[#e3dcc2]/60 px-6 font-bold text-[#1b2021] hover:bg-[#e3dc95]/55"
            >
              <Link href="/test/tobii">
                <Monitor className="h-5 w-5" />
                Use Tobii
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute right-5 bottom-24 hidden w-[32rem] max-w-[42vw] md:block">
        <div className="relative h-80 overflow-hidden border border-[#e3dcc2]/25 bg-[#e3dcc2]/92 p-6 shadow-2xl shadow-[#1b2021]/35">
          <div className="mb-6 flex items-center justify-between text-xs font-black tracking-[0.22em] uppercase text-[#51513d]">
            <span>Calibration field</span>
            <span>15 points</span>
          </div>
          <div className="relative space-y-6 font-serif text-2xl leading-none tracking-[0.18em] text-[#1b2021]/24">
            {WORDS.map((word, index) => (
              <div key={word} className="flex justify-between">
                <span>{word}</span>
                <span>{WORDS[(index + 2) % WORDS.length]}</span>
                <span>{WORDS[(index + 4) % WORDS.length]}</span>
              </div>
            ))}
          </div>

          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <motion.path
              d="M 42 92 C 126 68, 202 114, 294 82 S 430 96, 488 128 C 378 178, 214 118, 92 180 S 328 236, 462 212 C 346 280, 184 238, 56 302"
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
              d="M 58 126 C 156 102, 260 144, 390 110"
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

          {[
            [14, 25, 17, '#a6a867'],
            [34, 29, 12, '#e3dc95'],
            [52, 27, 21, '#51513d'],
            [73, 38, 14, '#a6a867'],
            [28, 58, 24, '#51513d'],
            [50, 66, 13, '#1b2021'],
            [76, 75, 19, '#a6a867'],
            [16, 82, 15, '#e3dc95'],
          ].map(([left, top, size, color], index) => (
            <motion.span
              key={`${left}-${top}`}
              className="absolute rounded-full border-2 border-[#e3dcc2]/80 mix-blend-multiply"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                backgroundColor: color,
              }}
              animate={{ scale: [0.86, 1.18, 0.86], opacity: [0.68, 1, 0.68] }}
              transition={{
                duration: 1.9 + index * 0.12,
                repeat: Infinity,
                delay: index * 0.12,
              }}
            />
          ))}

          <div className="absolute right-5 bottom-5 left-5 grid grid-cols-3 gap-2 text-[10px] font-black tracking-[0.18em] uppercase">
            <div className="bg-[#1b2021] px-3 py-3 text-[#e3dcc2]">Syllables</div>
            <div className="bg-[#51513d] px-3 py-3 text-[#e3dcc2]">Pseudo-words</div>
            <div className="bg-[#a6a867] px-3 py-3 text-[#1b2021]">Meaningful text</div>
          </div>
        </div>
      </div>

      <motion.a
        href="#signal"
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#1b2021]/70 uppercase"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <ArrowDown className="h-4 w-4" />
        Scroll
      </motion.a>
    </section>
  );
}
