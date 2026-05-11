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
  <div className="relative flex h-full w-full items-center justify-center bg-[#4A7C59]/5">
    <motion.div
      className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#4A7C59] bg-white shadow-sm"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    >
      <motion.div
        className="h-8 w-8 rounded-full bg-[#4A7C59] shadow-inner"
        animate={{ x: [-24, 24, -24, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  </div>
);

const CalibrationVisual = () => (
  <div className="relative h-full w-full bg-[#4A7C59]/5">
    <div
      className="absolute h-4 w-4 rounded-full bg-[#4A7C59]/30"
      style={{ top: '15%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#4A7C59]/30"
      style={{ top: '15%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#4A7C59]/30"
      style={{ top: '85%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-[#4A7C59]/30"
      style={{ top: '85%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />

    <motion.div
      className="absolute flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#4A7C59] bg-white shadow-md"
      style={{ x: '-50%', y: '-50%' }}
      animate={{
        top: ['15%', '15%', '85%', '85%', '50%'],
        left: ['15%', '85%', '15%', '85%', '50%'],
        scale: [1, 0.6, 1, 0.6, 1, 0.6, 1, 0.6, 1],
      }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="h-3 w-3 rounded-full bg-[#4A7C59]"
        animate={{ scale: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
  </div>
);

const StarGameVisual = () => (
  <div className="relative h-full w-full bg-amber-500/5">
    <div
      className="absolute h-4 w-4 rounded-full bg-amber-500/30"
      style={{ top: '15%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-amber-500/30"
      style={{ top: '15%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-amber-500/30"
      style={{ top: '85%', left: '15%', transform: 'translate(-50%, -50%)' }}
    />
    <div
      className="absolute h-4 w-4 rounded-full bg-amber-500/30"
      style={{ top: '85%', left: '85%', transform: 'translate(-50%, -50%)' }}
    />

    <motion.div
      className="absolute flex h-16 w-16 items-center justify-center text-amber-400 drop-shadow-md"
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
        <Star className="h-16 w-16 fill-amber-400/80" />
      </motion.div>
    </motion.div>
  </div>
);

const PositionVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#4A7C59]/5">
    <div className="flex h-3/4 w-1/2 items-center justify-center rounded-2xl border-4 border-[#4A7C59]/30 bg-white shadow-sm">
      <motion.div
        className="h-20 w-16 rounded-[2rem] border-2 border-dashed border-[#4A7C59]"
        animate={{ scale: [0.9, 1.1, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
    <motion.div
      className="absolute top-4 right-6 text-amber-400"
      animate={{ rotate: 360, scale: [1, 1.2, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      <Sun className="h-12 w-12 fill-amber-400/20" />
    </motion.div>
  </div>
);

const SecureVisual = () => (
  <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-[#4A7C59]/5">
    <Monitor className="h-16 w-16 text-[#4A7C59]" strokeWidth={1.5} />
    <div className="flex gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-[#4A7C59]"
          animate={{ y: [0, -12, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
    <div className="relative">
      <Shield className="h-12 w-12 text-[#4A7C59]" strokeWidth={1.5} />
      <motion.div
        className="absolute inset-0 -z-10 rounded-full bg-[#4A7C59] blur-xl"
        animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1.5, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  </div>
);

const PrivacyVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center bg-[#4A7C59]/5">
    <motion.div
      animate={{ rotateY: [0, 180, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <Shield className="h-24 w-24 fill-[#4A7C59]/10 text-[#4A7C59]" strokeWidth={1.5} />
    </motion.div>
    <motion.div
      className="absolute top-1/4 right-1/4 h-3 w-3 rounded-full bg-[#4A7C59]/40"
      animate={{ scale: [0, 1.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
    />
    <motion.div
      className="absolute bottom-1/4 left-1/4 h-4 w-4 rounded-full bg-[#4A7C59]/40"
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
      'Privacy first. We do not collect personal identifiers, and data exists only during your active session.',
    tips: [
      'No video recordings or face images stored',
      'No names or emails collected',
      'Closing the browser destroys all data',
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDF8F0]">
      {/* Skip button */}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-6 right-6 text-xs text-[#A09890] transition-colors hover:text-[#6B6560]"
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
              <div className="relative h-64 w-64 overflow-hidden rounded-3xl border border-[#E8E0D4] shadow-sm md:h-96 md:w-96">
                {slide.visual}
              </div>
            </div>

            {/* Right: Text Content */}
            <div className="flex flex-1 flex-col items-start gap-6 text-left">
              <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-[#2D2A26] md:text-5xl">
                {slide.title}
              </h2>

              <p className="text-lg leading-relaxed text-[#6B6560] md:text-xl">
                {slide.description}
              </p>

              {slide.highlight && (
                <p className="rounded-lg bg-[#4A7C59]/10 px-4 py-2 text-lg font-semibold text-[#4A7C59]">
                  {slide.highlight}
                </p>
              )}

              {slide.tips && slide.tips.length > 0 && (
                <div className="mt-2 w-full rounded-2xl border-2 border-[#E8E0D4] bg-white/80 p-6 shadow-sm md:p-8">
                  <ul className="space-y-4">
                    {slide.tips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-4 text-base text-[#6B6560] md:text-lg"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4A7C59]/20 text-sm font-bold text-[#4A7C59]">
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
        {/* Step indicator */}
        <StepIndicator
          steps={slides.map((s, idx) => ({ key: idx.toString(), label: s.title }))}
          currentStepKey={currentSlide.toString()}
          className="mx-auto"
        />

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={goPrev}
              className="border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={goNext} className="bg-[#4A7C59] px-8 text-white hover:bg-[#3D6A4B]">
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
