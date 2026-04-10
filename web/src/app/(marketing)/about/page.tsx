import type { Metadata } from 'next';
import { Eye, Brain, BarChart3, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Lexora — an eye-tracking-based dyslexia screening platform developed at the Faculty of Computing and Data Science.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      {/* Header */}
      <section className="px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">About Lexora</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Lexora is an eye-tracking-based dyslexia screening platform. It combines
            gaze analysis with machine learning to provide accessible, non-invasive
            reading difficulty detection.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 mt-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Dyslexia affects approximately 10-15% of the population, yet many cases go
            undiagnosed for years. Traditional screening methods can be expensive,
            time-consuming, and inaccessible.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Lexora aims to change this by providing a fast, research-backed screening
            tool that anyone can use — whether they have access to professional eye-tracking
            hardware or just a standard webcam. Our platform analyses how eyes move during
            reading to identify patterns commonly associated with dyslexia.
          </p>
        </div>
      </section>

      {/* Technology */}
      <section className="px-6 mt-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">How It Works</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4 p-5 rounded-xl border bg-card">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Eye Tracking</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Supports Tobii hardware for research-grade precision and webcam-based
                  tracking via MediaPipe for accessibility.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-xl border bg-card">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Gaze Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Extracts fixation duration, saccade patterns, regression frequency, and
                  other features linked to reading difficulty.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-xl border bg-card">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">ML Classification</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A trained machine learning model evaluates the extracted gaze features
                  and produces a risk-level assessment.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-xl border bg-card">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Privacy First</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All processing happens locally in your browser. No video is stored.
                  Gaze coordinates are abstract and anonymized.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 mt-16">
        <div className="max-w-3xl mx-auto p-6 rounded-xl border border-destructive/20 bg-destructive/5">
          <h3 className="font-semibold text-destructive mb-2">Important Disclaimer</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lexora is a screening tool developed for research purposes. It does not provide
            a clinical diagnosis of dyslexia. Results should be interpreted by qualified
            educational psychologists or healthcare professionals. This tool is not a
            substitute for professional assessment.
          </p>
        </div>
      </section>

      {/* Research Context */}
      <section className="px-6 mt-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Research Context</h2>
          <p className="text-muted-foreground leading-relaxed">
            This project is developed as part of a research initiative at the Faculty of
            Computing and Data Science. It draws on established eye-tracking research in
            reading and dyslexia detection, including work by Rayner (2009) and
            Holmqvist &amp; Andersson (2017).
          </p>
        </div>
      </section>
    </main>
  );
}
