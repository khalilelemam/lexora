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
      <section className="py-14 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs text-muted-foreground mb-4 uppercase tracking-wider font-medium">
            Gaze Pattern Visualization
          </p>
          <GazeTrailDemo />
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[oklch(0.70_0.10_115/0.6)]" />
              Forward fixation
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[oklch(0.52_0.12_25/0.6)]" />
              Regression
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg width="14" height="4">
                <line x1="0" y1="2" x2="14" y2="2" stroke="oklch(0.65 0.02 90 / 0.5)" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
              Return sweep
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="py-14 border-y bg-card/50">
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
              Professional-grade eye tracking meets accessible webcam-based analysis — designed
              to make dyslexia screening available to everyone.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Eye className="w-6 h-6" />}
              title="Dual Tracking Modes"
              description="Use the precision of Tobii eye trackers for clinical accuracy, or the convenience of any webcam with MediaPipe iris detection for broader access."
              delay={0.1}
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Engaging Calibration"
              description="Three calibration modes — classic grid, action stickman, and gentle star — with shrinking targets that adapt to different age groups."
              delay={0.2}
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Gaze Analytics"
              description="Fixation duration, saccade patterns, regression detection, and return sweeps — all the features that research links to reading difficulties."
              delay={0.3}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Privacy First"
              description="All video processing happens in your browser. No recordings stored, no personal data collected. Gaze coordinates are abstract and fully anonymized."
              delay={0.4}
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Research-Backed"
              description="Reading tasks designed around established research — syllable decoding, pseudo-word recognition, and meaningful text comprehension for thorough analysis."
              delay={0.5}
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Age-Adaptive"
              description="From gamified star calibration for young children to precise grid-based calibration for adults. Lexora adapts the experience to each user."
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
              Three simple steps from setup to results. The whole process takes about 5 minutes
              and requires no prior technical knowledge.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <StepCard
              step={1}
              icon={<Monitor className="w-7 h-7" />}
              title="Connect & Calibrate"
              description="Connect your Tobii device or grant webcam access. Our calibration process maps your unique gaze to the screen with precision."
              delay={0.1}
            />
            <StepCard
              step={2}
              icon={<BookOpen className="w-7 h-7" />}
              title="Read the Passages"
              description="Three reading tasks — syllables, pseudo-words, and meaningful text — optimized for capturing the gaze features that matter."
              delay={0.3}
            />
            <StepCard
              step={3}
              icon={<BarChart3 className="w-7 h-7" />}
              title="Get Results"
              description="Our ML model analyses gaze patterns and provides a risk assessment with detailed fixation visualization and actionable recommendations."
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
              Lexora is developed as a research initiative at the Faculty of Computing and Data
              Science. By combining eye-tracking technology with machine learning, we aim to make
              dyslexia screening accessible, affordable, and non-invasive — reaching children who
              might otherwise go undiagnosed.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our approach builds on decades of research linking specific eye movement patterns — such
              as increased fixation duration, higher regression rates, and irregular return sweeps — to
              reading difficulties. Lexora captures these patterns through calibrated gaze tracking and
              analyses them using a trained neural network.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
              <strong className="text-foreground/80">Important:</strong> This tool is for research and screening
              purposes only — it does not provide a clinical diagnosis. Results should always be interpreted
              by qualified professionals.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Built with</span>
              <span className="text-[oklch(0.70_0.10_115)]">♥</span>
              <span>by the Lexora Team</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
