'use client';

/**
 * Test layout — forces light mode because the camera requires good
 * contrast for face/iris detection. Users are informed on the landing
 * page that the test needs light mode.
 */
export default function TestLayout({ children }: { children: React.ReactNode }) {
  // Previously we forced light mode here for the camera. Now we allow user control via ThemeToggle.

  return <div className="bg-background min-h-screen">{children}</div>;
}
