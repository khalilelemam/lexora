import type { Metadata } from 'next';
import { Eye, Brain, BarChart3, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Lexora — an eye-tracking-based dyslexia screening platform developed at the Faculty of Computing and Data Science.',
};

export default function AboutPage() {
  return (
    <main className="bg-background min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold">About Lexora</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Lexora is an eye-tracking-based dyslexia screening platform. It combines gaze analysis
            with machine learning to provide accessible, non-invasive reading difficulty detection.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mt-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold">Our Mission</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Dyslexia affects approximately 10-15% of the population, yet many cases go undiagnosed
            for years. Traditional screening methods can be expensive, time-consuming, and
            inaccessible.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Lexora aims to change this by providing a fast, research-backed screening tool that
            anyone can use — whether they have access to professional eye-tracking hardware or just
            a standard webcam. Our platform analyses how eyes move during reading to identify
            patterns commonly associated with dyslexia.
          </p>
        </div>
      </section>

      {/* Technology */}
      <section className="mt-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-bold">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="bg-card flex gap-4 rounded-xl border p-5">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Eye Tracking</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Supports Tobii hardware for research-grade precision and webcam-based tracking via
                  MediaPipe for accessibility.
                </p>
              </div>
            </div>
            <div className="bg-card flex gap-4 rounded-xl border p-5">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Gaze Analysis</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Extracts fixation duration, saccade patterns, regression frequency, and other
                  features linked to reading difficulty.
                </p>
              </div>
            </div>
            <div className="bg-card flex gap-4 rounded-xl border p-5">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">ML Classification</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A trained machine learning model evaluates the extracted gaze features and
                  produces a risk-level assessment.
                </p>
              </div>
            </div>
            <div className="bg-card flex gap-4 rounded-xl border p-5">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Privacy First</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  All processing happens locally in your browser. No video is stored. Gaze
                  coordinates are abstract and anonymized.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mt-16 px-6">
        <div className="border-destructive/20 bg-destructive/5 mx-auto max-w-3xl rounded-xl border p-6">
          <h3 className="text-destructive mb-2 font-semibold">Important Disclaimer</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Lexora is a screening tool developed for research purposes. It does not provide a
            clinical diagnosis of dyslexia. Results should be interpreted by qualified educational
            psychologists or healthcare professionals. This tool is not a substitute for
            professional assessment.
          </p>
        </div>
      </section>

      {/* Research Context */}
      <section className="mt-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-bold">Research Context</h2>
          <p className="text-muted-foreground leading-relaxed">
            This project is developed as part of a research initiative at the Faculty of Computing
            and Data Science. It draws on established eye-tracking research in reading and dyslexia
            detection, including work by Rayner (2009) and Holmqvist &amp; Andersson (2017).
          </p>
        </div>
      </section>
    </main>
  );
}
