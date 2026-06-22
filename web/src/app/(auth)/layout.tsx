import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Lexora to access your dyslexia screening dashboard.',
};

/**
 * Auth layout — editorial Lexora chrome for sign-in / sign-up pages.
 * Split-screen design: Left side for branding, Right side for auth flow.
 * Constrained to `h-svh` to prevent scrolling.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-svh w-full flex-col overflow-hidden lg:grid lg:grid-cols-2">
      {/* LEFT PANEL: Branding & Marketing */}
      <div className="relative hidden flex-col justify-between bg-[#101314] p-12 lg:flex">
        {/* Background Gradients & Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#a6a867]/10 via-[#101314]/50 to-[#101314]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(166,168,103,.1) 1px, transparent 1px), linear-gradient(rgba(166,168,103,.1) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Decorative architectural elements */}
        <div className="absolute top-12 left-12 h-16 w-16 border-[4px] border-[#a6a867]/20" />
        <div className="absolute right-12 bottom-24 h-32 w-32 bg-[#51513d]/20 shadow-[12px_12px_0_rgba(16,19,20,1)]" />

        {/* Top Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[#e3dcc2]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1b2021"
              strokeWidth="2"
              className="h-6 w-6"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-widest text-[#e3dcc2] uppercase">
            Lexora
          </span>
        </div>

        {/* Massive Typography Hero */}
        <div className="relative z-10 -ml-4 flex flex-col justify-center">
          <div className="flex flex-col text-[8rem] leading-[0.8] font-black tracking-tighter text-[#e3dcc2]/5 selection:bg-transparent">
            <span>LEXORA</span>
            <span>LEXORA</span>
            <span className="text-[#a6a867]/10">LEXORA</span>
          </div>
          <div className="absolute inset-0 flex items-center p-8">
            <h1 className="text-5xl leading-tight font-black tracking-tight text-[#e3dcc2] md:text-6xl lg:text-7xl">
              Map your
              <br />
              <span className="text-[#a6a867]">potential</span>
            </h1>
          </div>
        </div>

        {/* Footer Area */}
        <div className="relative z-10">
          <p className="max-w-md text-sm leading-relaxed text-[#e3dcc2]/60">
            Advanced dyslexia screening and cognitive assessment platform. Gain immediate,
            actionable insights into reading patterns.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Content */}
      <div className="relative flex h-full flex-col items-center justify-center bg-[#e3dcc2] p-4 sm:p-8 lg:p-12">
        {/* Mobile-only logo */}
        <div className="absolute top-8 left-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center bg-[#1b2021]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e3dcc2"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Content Centering Wrapper */}
        <div className="relative z-10 w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
