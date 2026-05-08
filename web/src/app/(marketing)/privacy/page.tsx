import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lexora',
  description:
    'How Lexora handles eye-tracking data, camera access, and personal information during dyslexia screening.',
};

export default function PrivacyPage() {
  return (
    <main className="bg-background min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10 text-sm">Last updated: April 2026</p>

        <div className="space-y-10">
          <Section title="1. Data Controller">
            <p>
              Lexora is a research tool developed at the Faculty of Computing and Data Science. For
              questions about data handling, contact us via the project&apos;s{' '}
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

          <Section title="2. Legal Basis for Processing">
            <p>
              We process limited gaze coordinate data under the legal basis of{' '}
              <strong>legitimate research interest</strong> (GDPR Article 6(1)(f)). This processing
              is necessary for conducting non-invasive dyslexia screening research. No personal data
              beyond abstract gaze coordinates is collected or processed.
            </p>
          </Section>

          <Section title="3. Camera Access &amp; Video Processing">
            <p>
              When using webcam-based tracking, Lexora requests access to your device&apos;s camera.
              The video feed is processed <strong>entirely in your browser</strong> using
              Google&apos;s MediaPipe FaceLandmarker (loaded as a WebAssembly module). Critical
              details:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5">
              <li>No video frames are transmitted to any server</li>
              <li>No video is recorded, stored, or cached</li>
              <li>No screenshots or images of the user are captured</li>
              <li>Only abstract iris position coordinates (numerical x, y values) are extracted</li>
              <li>Camera access ends immediately when you leave the test page</li>
            </ul>
          </Section>

          <Section title="4. Data Categories Collected">
            <p>
              During a screening session, Lexora collects <strong>only</strong> the following:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5">
              <li>
                <strong>Gaze coordinates</strong> — normalized x, y values (0 to 1) representing
                where on the screen the user was looking, sampled at the device&apos;s refresh rate
              </li>
              <li>
                <strong>Timestamps</strong> — millisecond-precision timing for each gaze sample
              </li>
              <li>
                <strong>Screen dimensions</strong> — width and height of the display (for coordinate
                normalization)
              </li>
            </ul>
            <p className="mt-3">
              This data is abstract, anonymized, and contains{' '}
              <strong>no personally identifiable information</strong>.
            </p>
          </Section>

          <Section title="5. Data Retention &amp; Storage">
            <p>
              Lexora operates on a <strong>session-only</strong> data model:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5">
              <li>Gaze data exists only in browser memory during the active session</li>
              <li>Data is sent to the ML classification endpoint for real-time analysis</li>
              <li>No gaze data is stored persistently on any server</li>
              <li>No databases, logs, or files retain user data after the session ends</li>
              <li>Closing the browser tab permanently destroys all session data</li>
            </ul>
          </Section>

          <Section title="6. Tobii Eye Tracker">
            <p>
              When using a Tobii eye tracker, gaze data is streamed from the local Tobii desktop
              service (
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">localhost:28980</code>)
              directly to the web application via WebSocket. This communication is entirely local —{' '}
              <strong>no data leaves your computer</strong> during tracking. The Tobii service runs
              as a local process and does not communicate with external servers.
            </p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>Lexora uses the following third-party resources:</p>
            <ul className="mt-3 list-inside list-disc space-y-1.5">
              <li>
                <strong>MediaPipe FaceLandmarker</strong> — Google&apos;s face mesh model, loaded as
                a WebAssembly module from CDN. The model runs locally in your browser; no data is
                sent to Google.
              </li>
              <li>
                <strong>Lexora ML Service</strong> — Our classification endpoint receives only
                abstract gaze feature vectors (fixation durations, saccade amplitudes) for risk
                assessment. No personal identifiers are attached.
              </li>
            </ul>
          </Section>

          <Section title="8. What We Do NOT Collect">
            <ul className="list-inside list-disc space-y-1.5">
              <li>No names, emails, phone numbers, or personal identifiers</li>
              <li>No video recordings, camera snapshots, or face images</li>
              <li>No browsing history, device fingerprints, or IP addresses</li>
              <li>No cookies for tracking or advertising purposes</li>
              <li>No analytics scripts, ad trackers, or third-party tracking</li>
              <li>No health records or medical data</li>
            </ul>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              Lexora is designed as a dyslexia screening tool that may be used with children. We
              take children&apos;s privacy especially seriously:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5">
              <li>No personal information about the child is collected or stored</li>
              <li>Camera feed is processed locally and never transmitted</li>
              <li>
                We recommend that a parent, guardian, or educator supervises any session involving a
                child
              </li>
              <li>
                Results are displayed immediately and not stored — the supervising adult should note
                them if needed
              </li>
            </ul>
          </Section>

          <Section title="10. Data Subject Rights">
            <p>
              Under applicable data protection regulations (including GDPR), you have the right to:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5">
              <li>
                <strong>Access</strong> — request what data we hold (none is persisted)
              </li>
              <li>
                <strong>Erasure</strong> — request deletion (data is automatically deleted after
                each session)
              </li>
              <li>
                <strong>Objection</strong> — you can stop the test at any time by closing the
                browser
              </li>
              <li>
                <strong>Portability</strong> — gaze data can be exported during the session if
                needed
              </li>
            </ul>
            <p className="mt-3">
              Since Lexora does not store any personal data beyond the active session, most of these
              rights are inherently satisfied by design.
            </p>
          </Section>

          <Section title="11. Research Use">
            <p>
              This tool is intended for <strong>research and screening purposes only</strong> and
              does not constitute a medical diagnosis. If you participate in a formal research study
              using Lexora, separate informed consent and data handling procedures will apply as
              governed by the relevant research ethics board.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this privacy policy from time to time. Changes will be reflected on this
              page with an updated &quot;Last updated&quot; date. Continued use of Lexora after
              changes constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="13. Contact">
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
