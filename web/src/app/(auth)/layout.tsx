import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Lexora to access your dyslexia screening dashboard.',
};

/**
 * Auth layout — minimal chrome for sign-in / sign-up pages.
 * No navbar or footer; centered content.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-4">{children}</div>;
}
