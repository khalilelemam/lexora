'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Sun, Star, Shield, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { StepIndicator } from '@/components/shared';

interface PreTestSlidesProps {
  /** Test mode — affects slide content */
  mode: 'tobii' | 'webcam';
  /** Whether the test is using the kid-friendly star calibration mode */
  isStarMode?: boolean;
  /** Called when user completes the slides */
  onComplete: () => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
}

interface Slide {
  visual: React.ReactNode;
  title: string;
  description: string;
  tips?: string[];
  highlight?: string;
}

const WelcomeVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center bg-[#51513d]/5">
    <motion.div
      className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#51513d] bg-[#f3edd7] shadow-sm"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    >
      <motion.div
        className="h-8 w-8 rounded-full bg-[#51513d] shadow-inner"
        animate={{ x: [-24, 24, -24, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  </div>
);

const CalibrationVisual = () => (
  <div className="relative h-full w-full bg-[#51513d]/5">
    <div
      className="absolute h-4 w-4 rounded-full bg-[#51513d]/30"
      style={{ top: '15%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#51513d]/30"
      style={{ top: '15%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#51513d]/30"
      style={{ top: '85%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#51513d]/30"
      style={{ top: '85%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />

    <motion.div
      className="absolute flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#51513d] bg-[#f3edd7] shadow-md"
      style={{ x: '-50%', y: '-50%' }}
      animate={{
        top: ['15%', '15%', '85%', '85%', '50%'],
        left: ['15%', '85%', '15%', '85%', '50%'],
        scale: [1, 0.6, 1, 0.6, 1, 0.6, 1, 0.6, 1],
      }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="h-3 w-3 rounded-full bg-[#51513d]"
        animate={{ scale: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
  </div>
);

const StarGameVisual = () => (
  <div className="relative h-full w-full bg-[#e3dc95]/10">
    <div
      className="absolute h-4 w-4 rounded-full bg-[#e3dc95]/40"
      style={{ top: '15%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#e3dc95]/40"
      style={{ top: '15%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#e3dc95]/40"
      style={{ top: '85%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#e3dc95]/40"
      style={{ top: '85%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />

    <motion.div
      className="absolute flex h-16 w-16 items-center justify-center text-[#e3dc95] drop-shadow-md"
      style={{ x: '-50%', y: '-50%' }}
      animate={{
        top: ['15%', '15%', '85%', '85%', '50%'],
        left: ['15%', '85%', '15%', '85%', '50%'],
        scale: [1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        animate={{ rotate: [0, 5, 0, -5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Star className="h-16 w-16 fill-[#e3dc95]/80" />
      </motion.div>
    </motion.div>
  </div>
);

const PositionVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#51513d]/5">
    <div className="flex h-3/4 w-1/2 items-center justify-center rounded-2xl border-4 border-[#51513d]/30 bg-[#f3edd7] shadow-sm">
      <motion.div
        className="h-20 w-16 rounded-[2rem] border-2 border-dashed border-[#51513d]"
        animate={{ scale: [0.9, 1.1, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
    <motion.div
      className="absolute top-4 right-6 text-[#e3dc95]"
      animate={{ rotate: 360, scale: [1, 1.2, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      <Sun className="h-12 w-12 fill-[#e3dc95]/20" />
    </motion.div>
  </div>
);

const SecureVisual = () => (
  <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-[#51513d]/5">
    <Monitor className="h-16 w-16 text-[#51513d]" strokeWidth={1.5} />
    <div className="flex gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-[#51513d]"
          animate={{ y: [0, -12, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
    <div className="relative">
      <Shield className="h-12 w-12 text-[#51513d]" strokeWidth={1.5} />
      <motion.div
        className="absolute inset-0 -z-10 rounded-full bg-[#51513d] blur-xl"
        animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1.5, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  </div>
);

const PrivacyVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center bg-[#51513d]/5">
    <motion.div
      animate={{ rotateY: [0, 180, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <Shield className="h-24 w-24 fill-[#51513d]/10 text-[#51513d]" strokeWidth={1.5} />
    </motion.div>
    <motion.div
      className="absolute top-1/4 right-1/4 h-3 w-3 rounded-full bg-[#51513d]/40"
      animate={{ scale: [0, 1.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
    />
    <motion.div
      className="absolute bottom-1/4 left-1/4 h-4 w-4 rounded-full bg-[#51513d]/40"
      animate={{ scale: [0, 1.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
    />
  </div>
);

function getSlides(mode: 'tobii' | 'webcam', isStarMode: boolean): Slide[] {
  const whatYoullDoSlide: Slide = isStarMode
    ? {
        visual: <StarGameVisual />,
        title: 'Catch the Stars!',
        description:
          'Look directly at the glowing stars when they appear on the screen. They will magically shrink and vanish when you catch them with your eyes!',
        tips: [
          'Keep your eyes fixed on the star until it disappears',
          'Have fun and try to catch all of them!',
          'After the stars, just read the short story naturally',
        ],
      }
    : {
        visual: <CalibrationVisual />,
        title: "What You'll Do",
        description:
          mode === 'tobii'
            ? 'Follow the dots to calibrate, then complete 3 short reading tasks.'
            : 'Follow the dots to calibrate, then read a short paragraph naturally.',
        tips: [
          'Follow the calibration dots with your eyes',
          "Read the text naturally — don't rush",
          'Get instant results immediately after',
        ],
      };

  const common: Slide[] = [
    {
      visual: <WelcomeVisual />,
      title: 'Welcome to Lexora',
      description:
        'We analyze your eye movements while you read to screen for signs of dyslexia. Non-invasive, quick, and research-backed.',
      highlight: 'The whole process takes about 5 minutes.',
    },
    whatYoullDoSlide,
    {
      visual: <PositionVisual />,
      title: 'Prepare Your Space',
      description: 'Good conditions ensure accurate tracking.',
      tips: [
        "Sit directly at arm's length from the screen",
        'Ensure even lighting — avoid bright backlight',
        'Remove glasses if possible to reduce glare',
        mode === 'webcam' ? 'Ensure your webcam is clean' : 'Ensure your Tobii is connected',
      ],
    },
  ];

  const modeSpecific: Slide =
    mode === 'webcam'
      ? {
          visual: <SecureVisual />,
          title: 'Secure Webcam Tracking',
          description:
            'Your webcam tracks your eyes securely entirely inside your browser. No video is ever sent to our servers.',
          tips: [
            'We will ask for Camera permission next',
            'No video is recorded or stored',
            'Only abstract coordinates are used',
          ],
        }
      : {
          visual: <SecureVisual />,
          title: 'Secure Tobii Tracking',
          description:
            'Your local Tobii service tracks your eyes securely. All data stays entirely on your machine.',
          tips: [
            'Ensure the Tobii service is running (green)',
            'Infrared tracking is invisible and safe',
            'Provides higher accuracy for analysis',
          ],
        };

  const privacySlide: Slide = {
    visual: <PrivacyVisual />,
    title: 'Your Privacy',
    description:
      'Privacy first. Webcam video stays in your browser, while authenticated test attempts can save gaze coordinates and ML results for research and follow-up.',
    tips: [
      'No video recordings or face images stored',
      'Raw gaze JSON is saved only when you explicitly opted in during registration',
      'Attempt history is linked to your signed-in account',
    ],
  };

  return [...common, modeSpecific, privacySlide];
}

/**
 * Full-screen pre-test education slide deck.
 * Shown after "Start Test" but before camera setup / device check.
 * Ensures users understand what the test involves before proceeding.
 */
export function PreTestSlides({
  mode,
  isStarMode = false,
  onComplete,
  onSkip,
}: PreTestSlidesProps) {
  const slides = getSlides(mode, isStarMode);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const isLast = currentSlide === slides.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  }, [isLast, onComplete]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#e3dcc2]">
      {/* Skip button */}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-6 right-6 text-xs text-[#51513d]/60 transition-colors hover:text-[#1b2021]"
        >
          Skip introduction →
        </button>
      )}

      {/* Slide content */}
      <div className="flex w-full max-w-5xl flex-col items-center px-8 md:px-12">
        <LexoraLogo size="md" className="absolute top-8 left-8 mb-12 opacity-60" />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 80 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex h-[60vh] w-full flex-col items-center justify-center gap-12 md:flex-row md:gap-24"
          >
            {/* Left: Large Animated Visual */}
            <div className="flex h-full flex-1 items-center justify-center">
              <div className="relative h-64 w-64 overflow-hidden rounded-3xl border border-[#51513d]/18 shadow-[8px_8px_0_rgba(81,81,61,.1)] md:h-96 md:w-96">
                {slide.visual}
              </div>
            </div>

            {/* Right: Text Content */}
            <div className="flex flex-1 flex-col items-start gap-6 text-left">
              <h2 className="text-4xl leading-tight font-black tracking-tight text-[#1b2021] md:text-5xl">
                {slide.title}
              </h2>

              <p className="text-lg leading-relaxed text-[#1b2021]/68 md:text-xl">
                {slide.description}
              </p>

              {slide.highlight && (
                <p className="rounded-lg bg-[#a6a867]/15 px-4 py-2 text-lg font-black text-[#51513d]">
                  {slide.highlight}
                </p>
              )}

              {slide.tips && slide.tips.length > 0 && (
                <div className="mt-2 w-full rounded-2xl border-2 border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-sm md:p-8">
                  <ul className="space-y-4">
                    {slide.tips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-4 text-base text-[#1b2021]/68 md:text-lg"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a6a867]/25 text-sm font-black text-[#51513d]">
                          ✓
                        </span>
                        <span className="font-medium">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      <div className="absolute right-0 bottom-8 left-0 flex flex-col items-center gap-4">
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setDirection(idx > currentSlide ? 1 : -1);
                setCurrentSlide(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-6 bg-[#51513d]'
                  : 'w-2 bg-[#51513d]/25 hover:bg-[#51513d]/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={goPrev}
              className="border-[#51513d]/25 text-[#51513d] hover:text-[#1b2021]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={goNext} className="bg-[#51513d] px-8 text-[#e3dcc2] hover:bg-[#1b2021]">
            {isLast ? (
              <>
                I&apos;m Ready
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
