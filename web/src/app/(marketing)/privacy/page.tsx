import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'Lexora privacy policy — how we handle eye-tracking data, camera access, and your personal information.',
};

export default function PrivacyPage() {
  return (
    <main className="bg-background min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-4 text-4xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">
          Your privacy is fundamental to Lexora. This page explains exactly what data we access, how
          we process it, and what happens to it afterwards.
        </p>

        <div className="space-y-10">
          <Section title="Camera Access">
            <p>
              When using webcam-based tracking, Lexora requests access to your camera. The video
              feed is processed <strong>entirely in your browser</strong> using MediaPipe
              FaceLandmarker. No video frames are ever transmitted to any server, recorded, or
              stored. The camera feed is used solely to extract iris position coordinates in
              real-time.
            </p>
          </Section>

          <Section title="Gaze Data">
            <p>
              During the screening test, Lexora collects normalized gaze coordinates (x, y values
              between 0 and 1) timestamped to each reading task. This data is:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Processed locally in your browser to extract reading features</li>
              <li>Sent to our ML service only for classification (risk assessment)</li>
              <li>Not stored persistently on any server after the session ends</li>
              <li>Abstract and anonymized — no personal identifiers are attached</li>
            </ul>
          </Section>

          <Section title="Tobii Eye Tracker">
            <p>
              When using a Tobii eye tracker, gaze data is streamed from the local Tobii desktop
              service (<code className="bg-muted rounded px-1 py-0.5 text-xs">localhost:28980</code>
              ) directly to the web application. This communication stays entirely on your local
              machine — no data leaves your computer during tracking.
            </p>
          </Section>

          <Section title="What We Don't Collect">
            <ul className="list-inside list-disc space-y-1">
              <li>No names, emails, or personal identifiers</li>
              <li>No video recordings or camera snapshots</li>
              <li>No browsing history or device fingerprints</li>
              <li>No cookies for tracking or advertising</li>
              <li>No analytics or third-party tracking scripts</li>
            </ul>
          </Section>

          <Section title="Local Processing">
            <p>
              The calibration process (polynomial ridge regression model fitting), gaze feature
              extraction, and all data visualizations happen entirely in your browser using
              JavaScript. The only external communication is the final feature vector sent to the ML
              classification endpoint.
            </p>
          </Section>

          <Section title="Research Use">
            <p>
              Lexora is a research tool developed at the Faculty of Computing and Data Science. It
              is intended for screening purposes only and does not store or process personal health
              information. If you participate in a formal research study using Lexora, separate
              consent and data handling procedures will apply as governed by the research ethics
              board.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              If you have questions about how Lexora handles your data, please reach out via the
              project&apos;s{' '}
              <a
                href="https://github.com/khalilelemam/eglex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                GitHub repository
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
