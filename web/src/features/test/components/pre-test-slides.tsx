'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Monitor,
  BookOpen,
  Sun,
  Star,
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
  <div className="relative w-full h-full flex items-center justify-center bg-[#4A7C59]/5">
    <motion.div 
      className="w-24 h-24 border-4 border-[#4A7C59] rounded-full flex items-center justify-center relative shadow-sm bg-white"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    >
      <motion.div 
        className="w-8 h-8 bg-[#4A7C59] rounded-full shadow-inner"
        animate={{ x: [-24, 24, -24, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  </div>
);

const CalibrationVisual = () => (
  <div className="relative w-full h-full bg-[#4A7C59]/5">
    <div className="absolute w-4 h-4 bg-[#4A7C59]/30 rounded-full" style={{ top: '15%', left: '15%', transform: 'translate(-50%, -50%)' }} />
    <div className="absolute w-4 h-4 bg-[#4A7C59]/30 rounded-full" style={{ top: '15%', left: '85%', transform: 'translate(-50%, -50%)' }} />
    <div className="absolute w-4 h-4 bg-[#4A7C59]/30 rounded-full" style={{ top: '85%', left: '15%', transform: 'translate(-50%, -50%)' }} />
    <div className="absolute w-4 h-4 bg-[#4A7C59]/30 rounded-full" style={{ top: '85%', left: '85%', transform: 'translate(-50%, -50%)' }} />
    
    <motion.div 
      className="absolute w-8 h-8 rounded-full border-4 border-[#4A7C59] flex items-center justify-center bg-white shadow-md"
      style={{ x: '-50%', y: '-50%' }}
      animate={{ 
        top: ['15%', '15%', '85%', '85%', '50%'],
        left: ['15%', '85%', '15%', '85%', '50%'],
        scale: [1, 0.6, 1, 0.6, 1, 0.6, 1, 0.6, 1]
      }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
       <motion.div 
         className="w-3 h-3 bg-[#4A7C59] rounded-full" 
         animate={{ scale: [0.3, 1, 0.3] }} 
         transition={{ duration: 1.5, repeat: Infinity }} 
       />
    </motion.div>
  </div>
);

const StarGameVisual = () => (
  <div className="relative w-full h-full bg-amber-500/5">
    <div className="absolute w-4 h-4 bg-amber-500/30 rounded-full" style={{ top: '15%', left: '15%', transform: 'translate(-50%, -50%)' }} />
    <div className="absolute w-4 h-4 bg-amber-500/30 rounded-full" style={{ top: '15%', left: '85%', transform: 'translate(-50%, -50%)' }} />
    <div className="absolute w-4 h-4 bg-amber-500/30 rounded-full" style={{ top: '85%', left: '15%', transform: 'translate(-50%, -50%)' }} />
    <div className="absolute w-4 h-4 bg-amber-500/30 rounded-full" style={{ top: '85%', left: '85%', transform: 'translate(-50%, -50%)' }} />
    
    <motion.div 
      className="absolute w-16 h-16 flex items-center justify-center text-amber-400 drop-shadow-md"
      style={{ x: '-50%', y: '-50%' }}
      animate={{ 
        top: ['15%', '15%', '85%', '85%', '50%'],
        left: ['15%', '85%', '15%', '85%', '50%'],
        scale: [1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2, 1]
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
       <motion.div
         animate={{ rotate: [0, 5, 0, -5, 0] }}
         transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
       >
         <Star className="w-16 h-16 fill-amber-400/80" />
       </motion.div>
    </motion.div>
  </div>
);

const PositionVisual = () => (
  <div className="relative w-full h-full flex items-center justify-center bg-[#4A7C59]/5 overflow-hidden">
    <div className="w-1/2 h-3/4 border-4 border-[#4A7C59]/30 rounded-2xl flex items-center justify-center bg-white shadow-sm">
       <motion.div 
         className="w-16 h-20 border-2 border-dashed border-[#4A7C59] rounded-[2rem]"
         animate={{ scale: [0.9, 1.1, 1], opacity: [0.4, 1, 0.4] }}
         transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
       />
    </div>
    <motion.div 
       className="absolute top-4 right-6 text-amber-400"
       animate={{ rotate: 360, scale: [1, 1.2, 1] }}
       transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
       <Sun className="w-12 h-12 fill-amber-400/20" />
    </motion.div>
  </div>
);

const SecureVisual = () => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 bg-[#4A7C59]/5">
     <Monitor className="w-16 h-16 text-[#4A7C59]" strokeWidth={1.5} />
     <div className="flex gap-3">
       {[0,1,2].map(i => (
         <motion.div 
           key={i}
           className="w-2.5 h-2.5 bg-[#4A7C59] rounded-full"
           animate={{ y: [0, -12, 0], opacity: [0.2, 1, 0.2] }}
           transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
         />
       ))}
     </div>
     <div className="relative">
       <Shield className="w-12 h-12 text-[#4A7C59]" strokeWidth={1.5} />
       <motion.div 
         className="absolute inset-0 bg-[#4A7C59] rounded-full blur-xl -z-10"
         animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1.5, 0.8] }}
         transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
       />
     </div>
  </div>
);

const PrivacyVisual = () => (
  <div className="relative w-full h-full flex items-center justify-center bg-[#4A7C59]/5">
     <motion.div
       animate={{ rotateY: [0, 180, 360] }}
       transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
       style={{ transformStyle: 'preserve-3d' }}
     >
       <Shield className="w-24 h-24 text-[#4A7C59] fill-[#4A7C59]/10" strokeWidth={1.5} />
     </motion.div>
     <motion.div className="absolute top-1/4 right-1/4 w-3 h-3 bg-[#4A7C59]/40 rounded-full" animate={{ scale: [0, 1.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
     <motion.div className="absolute bottom-1/4 left-1/4 w-4 h-4 bg-[#4A7C59]/40 rounded-full" animate={{ scale: [0, 1.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }} />
  </div>
);

function getSlides(mode: 'tobii' | 'webcam', isStarMode: boolean): Slide[] {
  const whatYoullDoSlide: Slide = isStarMode
    ? {
        visual: <StarGameVisual />,
        title: 'Catch the Stars!',
        description: 'Look directly at the glowing stars when they appear on the screen. They will magically shrink and vanish when you catch them with your eyes!',
        tips: [
          'Keep your eyes fixed on the star until it disappears',
          'Have fun and try to catch all of them!',
          'After the stars, just read the short story naturally',
        ],
      }
    : {
        visual: <CalibrationVisual />,
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
export function PreTestSlides({ mode, isStarMode = false, onComplete, onSkip }: PreTestSlidesProps) {
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
            {/* Left: Large Animated Visual */}
            <div className="flex-1 flex justify-center items-center h-full">
              <div className="relative w-64 h-64 md:w-96 md:h-96 rounded-3xl overflow-hidden border border-[#E8E0D4] shadow-sm">
                {slide.visual}
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
