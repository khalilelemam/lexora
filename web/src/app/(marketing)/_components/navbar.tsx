'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

type NavLink =
  | { label: string; type: 'scroll'; href: string }
  | { label: string; type: 'page'; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Features', type: 'scroll', href: '#features' },
  { label: 'How It Works', type: 'scroll', href: '#how-it-works' },
  { label: 'About', type: 'page', href: '/about' },
  { label: 'FAQ', type: 'page', href: '/faq' },
  { label: 'Privacy', type: 'page', href: '/privacy' },
];

/**
 * Sticky navigation bar with scroll-blur effect and responsive mobile menu.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const pathname = usePathname();
  const router = useRouter();

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false);
    
    if (pathname !== '/') {
      // If we are not on the homepage, redirect to the homepage with the hash
      router.push(`/${id}`);
      return;
    }

    // Strip the '#' prefix
    const elId = id.startsWith('#') ? id.slice(1) : id;
    document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth' });
  }, [pathname, router]);

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b shadow-sm'
            : 'bg-transparent'
        }`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <LexoraLogo size="sm" />

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            {NAV_LINKS.map((link) =>
              link.type === 'scroll' ? (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scrollTo('#get-started')}
              className="hidden sm:inline-flex"
            >
              Start Screening
            </Button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile slide-out menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Panel */}
            <motion.div
              className="fixed top-16 right-0 bottom-0 z-40 w-72 bg-background border-l shadow-xl sm:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex flex-col gap-2 p-6">
                {NAV_LINKS.map((link) =>
                  link.type === 'scroll' ? (
                    <button
                      key={link.href}
                      onClick={() => scrollTo(link.href)}
                      className="text-left py-3 px-4 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-left py-3 px-4 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
                <div className="border-t my-2" />
                <Button onClick={() => scrollTo('#get-started')} className="w-full">
                  Start Screening
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
