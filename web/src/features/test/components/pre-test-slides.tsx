'use client';

import { useState, useCallback } from 'react';
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
      icon: <Eye className="w-10 h-10" />,
      title: 'Welcome to Lexora',
      description:
        'Lexora uses eye-tracking technology to screen for signs of dyslexia by analysing how your eyes move while reading. This is a non-invasive, research-backed screening — not a medical diagnosis.',
      highlight: 'The whole process takes about 5 minutes.',
    },
    {
      icon: <BookOpen className="w-10 h-10" />,
      title: 'What You\'ll Do',
      description:
        mode === 'tobii'
          ? 'You\'ll go through 3 simple steps: calibration (following dots on screen), then 3 short reading tasks — syllables, pseudo-words, and a paragraph of text.'
          : 'You\'ll go through 3 simple steps: calibration (following dots on screen), then a short reading task — reading a paragraph of text naturally.',
      tips: [
        'Follow the calibration dots with your eyes only',
        'Read the text naturally — don\'t rush or skip',
        'Results appear immediately after the reading tasks',
      ],
    },
    {
      icon: <Sun className="w-10 h-10" />,
      title: 'Prepare Your Environment',
      description: 'Good conditions make a big difference in accuracy.',
      tips: [
        'Sit at arm\'s length from the screen',
        'Make sure your face is evenly lit — avoid bright light behind you',
        'Remove glasses if possible to reduce reflections',
        'Close other browser tabs to improve performance',
        mode === 'webcam'
          ? 'Ensure your webcam is clean and unobstructed'
          : 'Ensure your Tobii device is connected and positioned correctly',
      ],
    },
  ];

  const modeSpecific: Slide =
    mode === 'webcam'
      ? {
          icon: <Monitor className="w-10 h-10" />,
          title: 'How Webcam Tracking Works',
          description:
            'Lexora uses your webcam to detect your iris position through a face-mesh AI model. The video feed is processed entirely in your browser — no images are ever sent to any server.',
          tips: [
            'Camera permission is required — we\'ll ask when you proceed',
            'No video is recorded or stored',
            'Only abstract eye coordinates are used for analysis',
          ],
        }
      : {
          icon: <Monitor className="w-10 h-10" />,
          title: 'How Tobii Tracking Works',
          description:
            'Your Tobii eye tracker sends precise gaze coordinates to the local Lexora service running on your computer. All data stays on your machine during tracking.',
          tips: [
            'Make sure the Tobii service is running (green status)',
            'The device uses infrared — invisible and safe',
            'Tobii provides higher accuracy than webcam tracking',
          ],
        };

  const privacySlide: Slide = {
    icon: <Shield className="w-10 h-10" />,
    title: 'Your Privacy',
    description:
      'Lexora is designed with privacy first. No personal data is collected — only abstract gaze coordinates.',
    tips: [
      'No video recordings or face images are stored',
      'No names, emails, or personal identifiers collected',
      'Data exists only during the active session',
      'Closing the browser destroys all session data',
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
      <div className="flex flex-col items-center max-w-lg px-6 text-center">
        <LexoraLogo size="sm" className="mb-8 opacity-60" />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 60 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-5"
          >
            {/* Icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#4A7C59]/10 text-[#4A7C59]">
              {slide.icon}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#2D2A26]">{slide.title}</h2>

            {/* Description */}
            <p className="text-sm text-[#6B6560] leading-relaxed">{slide.description}</p>

            {/* Highlight */}
            {slide.highlight && (
              <p className="text-sm font-semibold text-[#4A7C59]">{slide.highlight}</p>
            )}

            {/* Tips */}
            {slide.tips && slide.tips.length > 0 && (
              <div className="w-full rounded-xl border border-[#E8E0D4] bg-white/60 p-4 text-left">
                <ul className="space-y-2">
                  {slide.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-[#6B6560]">
                      <span className="mt-0.5 shrink-0 text-[#4A7C59] font-bold">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
