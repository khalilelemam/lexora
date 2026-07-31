'use client';

/**
 * Test layout — the camera needs good contrast for face/iris detection, which
 * is one of the reasons the app is light only. `ThemeProvider` forces that
 * globally, so this layout just pins the brand surface colours.
 */
export default function TestLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#e3dcc2] text-[#1b2021]">{children}</div>;
}
