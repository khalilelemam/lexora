import { Navbar } from './_components/navbar';
import { Footer } from './_components/footer';

/**
 * Marketing layout — wraps all public-facing pages (/, /about, etc.)
 * with the persistent Navbar and Footer.
 *
 * This layout does NOT apply to /test/* routes, which use their own
 * fullscreen chrome-less shell.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
