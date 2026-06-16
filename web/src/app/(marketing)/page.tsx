import { Eye, Sparkles, Shield, BookOpen, BarChart3, Users, Monitor } from 'lucide-react';
import { HeroSection } from './_components/hero-section';
import { GazeTrailDemo } from './_components/gaze-trail-demo';
import { AnimatedStat } from './_components/animated-stat';
import { FeatureCard } from './_components/feature-card';
import { StepCard } from './_components/step-card';
import { CtaSection } from './_components/cta-section';
import { DownloadSection } from './_components/download-section';

/**
 * Lexora landing page — Server Component.
 *
 * All static content (headings, section wrappers, text) renders on the
 * server. Interactive pieces (hero animations, counters, cards with
 * scroll-triggered animations) are isolated client islands imported above.
 */
export default function HomePage() {
  return (
    <main className="bg-background min-h-screen">
      {/* ── Hero ──────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Gaze Demo Strip ──────────────────────────────── */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <p className="text-muted-foreground mb-4 text-center text-xs font-medium tracking-wider uppercase">
            Gaze Pattern Visualization
          </p>
          <GazeTrailDemo />
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[oklch(0.70_0.10_115/0.6)]" />
              Forward fixation
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[oklch(0.52_0.12_25/0.6)]" />
              Regression
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <svg width="14" height="4">
                <line
                  x1="0"
                  y1="2"
                  x2="14"
                  y2="2"
                  stroke="oklch(0.65 0.02 90 / 0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
              Return sweep
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="bg-card/50 border-y py-14">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-12 px-6">
          <AnimatedStat value={15} label="Calibration Points" />
          <AnimatedStat value={3} label="Reading Tasks" />
          <AnimatedStat value={2} label="Tracking Modes" />
          <AnimatedStat value={478} label="Face Landmarks" />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold">Built for Accuracy &amp; Accessibility</h2>
            <p className="text-muted-foreground mx-auto max-w-lg">
              Professional-grade eye tracking meets accessible webcam-based analysis — designed to
              make dyslexia screening available to everyone.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Dual Tracking Modes"
              description="Use the precision of Tobii eye trackers for clinical accuracy, or the convenience of any webcam with MediaPipe iris detection for broader access."
              delay={0.1}
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Engaging Calibration"
              description="Three calibration modes — classic grid, action stickman, and gentle star — with shrinking targets that adapt to different age groups."
              delay={0.2}
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Gaze Analytics"
              description="Fixation duration, saccade patterns, regression detection, and return sweeps — all the features that research links to reading difficulties."
              delay={0.3}
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Privacy First"
              description="All video processing happens in your browser. No video recordings are stored, and saved attempts persist only the gaze coordinates and metadata needed for research workflows."
              delay={0.4}
            />
            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="Research-Backed"
              description="Reading tasks designed around established research — syllable decoding, pseudo-word recognition, and meaningful text comprehension for thorough analysis."
              delay={0.5}
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Age-Adaptive"
              description="From gamified star calibration for young children to precise grid-based calibration for adults. Lexora adapts the experience to each user."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="bg-card/40 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mx-auto max-w-lg">
              Three simple steps from setup to results. The whole process takes about 5 minutes and
              requires no prior technical knowledge.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <StepCard
              step={1}
              icon={<Monitor className="h-7 w-7" />}
              title="Connect & Calibrate"
              description="Connect your Tobii device or grant webcam access. Our calibration process maps your unique gaze to the screen with precision."
              delay={0.1}
            />
            <StepCard
              step={2}
              icon={<BookOpen className="h-7 w-7" />}
              title="Read the Passages"
              description="Three reading tasks — syllables, pseudo-words, and meaningful text — optimized for capturing the gaze features that matter."
              delay={0.3}
            />
            <StepCard
              step={3}
              icon={<BarChart3 className="h-7 w-7" />}
              title="Get Results"
              description="Our ML model analyses gaze patterns and provides a risk assessment with detailed fixation visualization and actionable recommendations."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ── Download Tobii Service ────────────────────────── */}
      <DownloadSection />

      {/* ── Call to Action ────────────────────────────────── */}
      <CtaSection />

      {/* ── About ────────────────────────────────────────── */}
      <section id="about" className="bg-card/40 border-t px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="mb-6 text-3xl font-bold">About Lexora</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Lexora is developed as a research initiative at the Faculty of Computing and Data
              Science. By combining eye-tracking technology with machine learning, we aim to make
              dyslexia screening accessible, affordable, and non-invasive — reaching children who
              might otherwise go undiagnosed.
            </p>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Our approach builds on decades of research linking specific eye movement patterns —
              such as increased fixation duration, higher regression rates, and irregular return
              sweeps — to reading difficulties. Lexora captures these patterns through calibrated
              gaze tracking and analyses them using a trained neural network.
            </p>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              <strong className="text-foreground/80">Important:</strong> This tool is for research
              and screening purposes only — it does not provide a clinical diagnosis. Results should
              always be interpreted by qualified professionals.
            </p>
            <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
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
