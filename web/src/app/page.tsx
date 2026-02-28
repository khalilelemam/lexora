import Link from 'next/link';
import { Eye, Camera, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Lexora</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Dyslexia screening platform powered by eye-tracking technology
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          {/* Tobii Eye Tracker */}
          <Link
            href="/test/tobii"
            className="group flex flex-col gap-3 rounded-lg border bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Eye Tracker Test</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Professional screening using a Tobii eye tracker. 3 reading tasks with high
                accuracy gaze tracking.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              Start test
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Webcam */}
          <Link
            href="/test/webcam"
            className="group flex flex-col gap-3 rounded-lg border bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Webcam Test</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browser-based screening using your webcam. Single paragraph reading with AI-powered
                gaze estimation.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              Start test
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        <p className="max-w-md text-xs text-muted-foreground">
          This is a screening tool, not a medical diagnosis. Results should be interpreted by a
          qualified professional.
        </p>
      </div>
    </main>
  );
}
