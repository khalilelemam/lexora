'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Monitor,
  BookOpen,
  Sun,
  Shield,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';

interface PreTestSlidesProps {
  /** Test mode — affects slide content */
  mode: 'tobii' | 'webcam';
  /** Called when user completes the slides */
  onComplete: () => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
}

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips?: string[];
  highlight?: string;
}

function getSlides(mode: 'tobii' | 'webcam'): Slide[] {
  const common: Slide[] = [
    {
      icon: <Eye />,
      title: 'Welcome to Lexora',
      description:
        'We analyze your eye movements while you read to screen for signs of dyslexia. Non-invasive, quick, and research-backed.',
      highlight: 'The whole process takes about 5 minutes.',
    },
    {
      icon: <BookOpen />,
      title: 'What You\'ll Do',
      description:
        mode === 'tobii'
          ? 'Follow the dots to calibrate, then complete 3 short reading tasks.'
          : 'Follow the dots to calibrate, then read a short paragraph naturally.',
      tips: [
        'Follow the calibration dots with your eyes',
        'Read the text naturally — don\'t rush',
        'Get instant results immediately after',
      ],
    },
    {
      icon: <Sun />,
      title: 'Prepare Your Space',
      description: 'Good conditions ensure accurate tracking.',
      tips: [
        'Sit directly at arm\'s length from the screen',
        'Ensure even lighting — avoid bright backlight',
        'Remove glasses if possible to reduce glare',
        mode === 'webcam' ? 'Ensure your webcam is clean' : 'Ensure your Tobii is connected',
      ],
    },
  ];

  const modeSpecific: Slide =
    mode === 'webcam'
      ? {
          icon: <Monitor />,
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
          icon: <Monitor />,
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
    icon: <Shield />,
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
export function PreTestSlides({ mode, onComplete, onSkip }: PreTestSlidesProps) {
  const slides = getSlides(mode);
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
          className="absolute top-6 right-6 text-xs text-[#A09890] hover:text-[#6B6560] transition-colors"
        >
          Skip introduction →
        </button>
      )}

      {/* Slide content */}
      <div className="flex flex-col items-center w-full max-w-5xl px-8 md:px-12">
        <LexoraLogo size="md" className="mb-12 opacity-60 absolute top-8 left-8" />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 80 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 w-full h-[60vh]"
          >
            {/* Left: Large Visual Icon */}
            <div className="flex-1 flex justify-center items-center">
              <div className="relative w-56 h-56 md:w-80 md:h-80 rounded-[3rem] bg-[#4A7C59]/10 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#4A7C59]/20 to-transparent opacity-50" />
                {React.cloneElement(slide.icon as React.ReactElement, { className: "w-28 h-28 md:w-40 md:h-40 text-[#4A7C59] relative z-10" })}
              </div>
            </div>

            {/* Right: Text Content */}
            <div className="flex-1 flex flex-col items-start text-left gap-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#2D2A26] tracking-tight leading-tight">
                {slide.title}
              </h2>
              
              <p className="text-lg md:text-xl text-[#6B6560] leading-relaxed">
                {slide.description}
              </p>

              {slide.highlight && (
                <p className="text-lg font-semibold text-[#4A7C59] bg-[#4A7C59]/10 px-4 py-2 rounded-lg">
                  {slide.highlight}
                </p>
              )}

              {slide.tips && slide.tips.length > 0 && (
                <div className="w-full rounded-2xl border-2 border-[#E8E0D4] bg-white/80 p-6 md:p-8 mt-2 shadow-sm">
                  <ul className="space-y-4">
                    {slide.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-base md:text-lg text-[#6B6560]">
                        <span className="mt-0.5 shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#4A7C59]/20 text-[#4A7C59] font-bold text-sm">
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
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
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
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                idx === currentSlide
                  ? 'w-6 bg-[#4A7C59]'
                  : 'w-2 bg-[#D4CBBD] hover:bg-[#A09890]',
              )}
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
              className="border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            onClick={goNext}
            className="bg-[#4A7C59] text-white hover:bg-[#3D6A4B] px-8"
          >
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
