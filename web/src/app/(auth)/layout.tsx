import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Lexora to access your dyslexia screening dashboard.',
};

/**
 * Auth layout — editorial Lexora chrome for sign-in / sign-up pages.
 * No navbar or footer; centered content with branded background.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#e3dcc2] p-4">
      {/* Grid overlay — matches landing stage */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.06) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.06) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Decorative geometric elements */}
      <div className="absolute top-12 left-8 hidden h-20 w-20 border-[6px] border-[#1b2021] md:block" />
      <div className="absolute right-[8%] bottom-16 hidden h-28 w-28 bg-[#51513d] shadow-[12px_12px_0_rgba(27,32,33,.18)] md:block" />
      <div className="absolute top-[18%] right-12 hidden h-14 w-14 bg-[#a6a867] shadow-[8px_8px_0_rgba(27,32,33,.12)] md:block" />
      <div className="absolute bottom-[22%] left-[6%] hidden h-3 w-32 bg-[#e3dc95] md:block" />

      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(227,220,149,.35), transparent 30rem), radial-gradient(circle at 85% 20%, rgba(166,168,103,.2), transparent 18rem)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[440px]">{children}</div>
    </div>
  );
}
