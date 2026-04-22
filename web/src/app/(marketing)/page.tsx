import {
  Eye,
  Sparkles,
  Shield,
  BookOpen,
  BarChart3,
  Users,
  Monitor,
} from 'lucide-react';
import { HeroSection } from './_components/hero-section';
import { GazeTrailDemo } from './_components/gaze-trail-demo';
import { AnimatedStat } from './_components/animated-stat';
import { FeatureCard } from './_components/feature-card';
import { StepCard } from './_components/step-card';
import { CtaSection } from './_components/cta-section';

/**
 * Lexora landing page — Server Component.
 *
 * All static content (headings, section wrappers, text) renders on the
 * server. Interactive pieces (hero animations, counters, cards with
 * scroll-triggered animations) are isolated client islands imported above.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ──────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Gaze Demo Strip ──────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">
            Gaze Pattern Visualization
          </p>
          <GazeTrailDemo />
          <p className="text-center text-xs text-muted-foreground mt-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[oklch(0.70_0.10_115/0.6)] mr-1 align-middle" />
            Forward fixation
            <span className="mx-3">•</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[oklch(0.52_0.12_25/0.6)] mr-1 align-middle" />
            Regression
          </p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="py-12 border-y bg-card/50">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-12 px-6">
          <AnimatedStat value={15} label="Calibration Points" />
          <AnimatedStat value={3} label="Reading Tasks" />
          <AnimatedStat value={2} label="Tracking Modes" />
          <AnimatedStat value={478} label="Face Landmarks" />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Built for Accuracy &amp; Accessibility</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Combining hardware-grade eye tracking with accessible webcam-based analysis.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Eye className="w-6 h-6" />}
              title="Dual Tracking Modes"
              description="Use the precision of Tobii eye trackers or the convenience of any webcam with MediaPipe iris detection."
              delay={0.1}
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Engaging Calibration"
              description="Three calibration modes — classic grid, action stickman, and gentle star — tailored for different age groups."
              delay={0.2}
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Gaze Analytics"
              description="Fixation duration, saccade patterns, and regression detection — all the features that research links to dyslexia."
              delay={0.3}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Privacy First"
              description="All processing happens locally. No video recordings are stored. Gaze coordinates are abstract and anonymized."
              delay={0.4}
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Research-Backed"
              description="Tasks designed around established reading research — syllable decoding, pseudo-word recognition, and meaningful text comprehension."
              delay={0.5}
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Age-Adaptive"
              description="From gamified calibration for young children to precise grid-based calibration for adults. Lexora adapts to the user."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 bg-card/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Three simple steps from setup to results. The whole process takes about 5 minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <StepCard
              step={1}
              icon={<Monitor className="w-7 h-7" />}
              title="Connect & Calibrate"
              description="Connect your Tobii device or grant webcam access. Our calibration process maps your gaze to the screen."
              delay={0.1}
            />
            <StepCard
              step={2}
              icon={<BookOpen className="w-7 h-7" />}
              title="Read the Passages"
              description="Three reading tasks — syllables, pseudo-words, and meaningful text — optimized for gaze feature extraction."
              delay={0.3}
            />
            <StepCard
              step={3}
              icon={<BarChart3 className="w-7 h-7" />}
              title="Get Results"
              description="Our ML model analyses gaze patterns and provides a risk assessment with detailed fixation visualization."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ── Call to Action ────────────────────────────────── */}
      <CtaSection />

      {/* ── About ────────────────────────────────────────── */}
      <section id="about" className="py-20 px-6 border-t bg-card/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">About Lexora</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Lexora is developed as part of a research project at the Faculty of Computing
              and Data Science. The platform combines eye-tracking technology with machine learning
              to provide accessible, non-invasive dyslexia screening.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              This tool is intended for research and screening purposes only — it does not provide
              a clinical diagnosis. Results should be interpreted by qualified professionals.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Built with</span>
              <span className="text-primary">♥</span>
              <span>by the Lexora Team</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
