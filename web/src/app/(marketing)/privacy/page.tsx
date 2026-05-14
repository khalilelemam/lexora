import type { Metadata } from 'next';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Privacy Policy — Lexora',
  description:
    'How Lexora handles eye-tracking data, camera access, and personal information during dyslexia screening.',
};

const PRIVACY_SECTIONS = [
  {
    title: '1. Data Controller',
    description: (
      <>
        Lexora is a research tool developed at the Faculty of Computing and Data Science. For
        questions about data handling, contact us via the project&apos;s{' '}
        <a
          href="https://github.com/khalilelemam/lexora"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          GitHub repository
        </a>
        .
      </>
    ),
  },
  {
    title: '2. Legal Basis for Processing',
    description: (
      <>
        We process limited gaze coordinate data under the legal basis of{' '}
        <strong>legitimate research interest</strong> (GDPR Article 6(1)(f)). This processing is
        necessary for conducting non-invasive dyslexia screening research. When you create an
        account, we also process the authentication data needed to sign you in and associate test
        attempts with the correct user.
      </>
    ),
  },
  {
    title: '3. Camera Access & Video Processing',
    description: (
      <>
        When using webcam-based tracking, Lexora requests access to your device&apos;s camera. The
        video feed is processed <strong>entirely in your browser</strong> using Google&apos;s
        MediaPipe FaceLandmarker (loaded as a WebAssembly module). Critical details:
      </>
    ),
    list: [
      'No video frames are transmitted to any server',
      'No video is recorded, stored, or cached',
      'No screenshots or images of the user are captured',
      'Only abstract iris position coordinates (numerical x, y values) are extracted',
      'Camera access ends immediately when you leave the test page',
    ],
  },
  {
    title: '4. Data Categories Collected',
    description: (
      <>
        During a screening session, Lexora collects <strong>only</strong> the following:
      </>
    ),
    list: [
      <>
        <strong>Gaze coordinates</strong> — normalized x, y values (0 to 1) representing where on
        the screen the user was looking, sampled at the device&apos;s refresh rate
      </>,
      <>
        <strong>Timestamps</strong> — millisecond-precision timing for each gaze sample
      </>,
      <>
        <strong>Screen dimensions</strong> — width and height of the display (for coordinate
        normalization)
      </>,
      <>
        <strong>Test metadata</strong> — test mode, calibration mode, participant age, optional
        session label, and the ML outcome returned for the attempt
      </>,
      <>
        <strong>Account identifiers</strong> — the signed-in user account needed to associate saved
        attempts with the correct session owner
      </>,
    ],
    afterList: (
      <>
        Webcam video is not stored. The persisted research record is limited to gaze-derived data,
        test metadata, and the authenticated account required to manage saved attempts.
      </>
    ),
  },
  {
    title: '5. Data Retention & Storage',
    description: (
      <>
        Lexora stores submitted attempts for authenticated users to support research workflows and
        follow-up review:
      </>
    ),
    list: [
      'Webcam video remains in browser memory and is not stored persistently',
      'Data is sent to the ML classification endpoint for real-time analysis',
      'The full ML response is saved in Azure Blob Storage under a derived JSON file',
      'Raw gaze JSON is saved only when the user explicitly opted in to raw-data storage during registration',
      'Attempt metadata and blob URLs are written to the application database for authenticated users',
    ],
  },
  {
    title: '6. Tobii Eye Tracker',
    description: (
      <>
        When using a Tobii eye tracker, gaze data is streamed from the local Tobii desktop service (
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">localhost:28980</code>) directly to
        the web application via WebSocket. This communication is entirely local —{' '}
        <strong>no data leaves your computer</strong> during tracking. The Tobii service runs as a
        local process and does not communicate with external servers.
      </>
    ),
  },
  {
    title: '7. Third-Party Services',
    description: 'Lexora uses the following third-party resources:',
    list: [
      <>
        <strong>MediaPipe FaceLandmarker</strong> — Google&apos;s face mesh model, loaded as a
        WebAssembly module from CDN. The model runs locally in your browser; no data is sent to
        Google.
      </>,
      <>
        <strong>Lexora ML Service</strong> — Our classification endpoint receives only abstract gaze
        coordinates and derived features needed for risk assessment. The resulting ML response is
        stored alongside the attempt record for research follow-up.
      </>,
      <>
        <strong>Azure Blob Storage</strong> — Persisted raw and derived JSON artifacts for saved
        attempts are stored in a single container using per-attempt paths.
      </>,
    ],
  },
  {
    title: '8. What We Do NOT Collect',
    list: [
      'No video recordings, camera snapshots, or face images',
      'No phone numbers or unrelated profile data',
      'No browsing history or advertising identifiers',
      'No cookies for tracking or advertising purposes',
      'No analytics scripts, ad trackers, or third-party tracking',
      'No health records or medical data',
    ],
  },
  {
    title: "9. Children's Privacy",
    description: (
      <>
        Lexora is designed as a dyslexia screening tool that may be used with children. We take
        children&apos;s privacy especially seriously:
      </>
    ),
    list: [
      'Camera feed is processed locally and video is never stored',
      'Saved attempts store only the participant age, optional label, test metadata, and gaze-derived data needed for research workflows',
      'We recommend that a parent, guardian, or educator supervises any session involving a child',
      'Raw gaze JSON is stored only when the account owner explicitly opted in during registration',
    ],
  },
  {
    title: '10. Data Subject Rights',
    description:
      'Under applicable data protection regulations (including GDPR), you have the right to:',
    list: [
      <>
        <strong>Access</strong> — request what account-linked attempt data we hold
      </>,
      <>
        <strong>Erasure</strong> — request deletion of persisted attempts and linked artifacts
      </>,
      <>
        <strong>Objection</strong> — you can stop the test at any time by closing the browser
      </>,
      <>
        <strong>Portability</strong> — gaze data can be exported during the session if needed
      </>,
    ],
    afterList:
      'Because Lexora stores authenticated attempt records for research workflows, these rights are handled through the project team rather than by automatic session expiry alone.',
  },
  {
    title: '11. Research Use',
    description: (
      <>
        This tool is intended for <strong>research and screening purposes only</strong> and does not
        constitute a medical diagnosis. If you participate in a formal research study using Lexora,
        separate informed consent and data handling procedures will apply as governed by the
        relevant research ethics board.
      </>
    ),
  },
  {
    title: '12. Changes to This Policy',
    description:
      'We may update this privacy policy from time to time. Changes will be reflected on this page with an updated "Last updated" date. Continued use of Lexora after changes constitutes acceptance of the revised policy.',
  },
  {
    title: '13. Contact',
    description: (
      <>
        If you have questions about how Lexora handles your data, please reach out via the
        project&apos;s{' '}
        <a
          href="https://github.com/khalilelemam/lexora"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          GitHub repository
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="bg-background min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10 text-sm">Last updated: May 2026</p>

        <div className="space-y-10">
          {PRIVACY_SECTIONS.map((section, idx) => (
            <Section key={idx} title={section.title}>
              {section.description && <p>{section.description}</p>}
              {section.list && section.list.length > 0 && (
                <ul
                  className={cn(
                    'list-inside list-disc space-y-1.5',
                    section.description ? 'mt-3' : '',
                  )}
                >
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {section.afterList && <p className="mt-3">{section.afterList}</p>}
            </Section>
          ))}
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
