'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserNav } from '@/components/shared/user-nav';

type NavLink =
  | { label: string; type: 'scroll'; href: string }
  | { label: string; type: 'page'; href: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Signal', type: 'scroll', href: '#signal' },
  { label: 'Modes', type: 'scroll', href: '#modes' },
  { label: 'Workflow', type: 'scroll', href: '#workflow' },
  { label: 'About', type: 'page', href: '/about' },
  { label: 'FAQ', type: 'page', href: '/faq' },
  { label: 'Privacy', type: 'page', href: '/privacy' },
];

/**
 * Sticky navigation bar with scroll-blur effect and responsive mobile menu.
 * Scroll links navigate to sections on the homepage; page links are real routes.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active section for scroll links on the home page
  useEffect(() => {
    if (pathname !== '/') return;

    const sectionIds = ['signal', 'modes', 'workflow', 'download', 'get-started', 'about'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const scrollTo = useCallback(
    (id: string) => {
      setMobileOpen(false);
      // If we're not on the home page, navigate there first
      if (pathname !== '/') {
        window.location.href = `/${id}`;
        return;
      }
      const elId = id.startsWith('#') ? id.slice(1) : id;
      document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth' });
    },
    [pathname],
  );

  const isLinkActive = (link: NavLink) => {
    if (link.type === 'scroll') return activeSection === link.href;
    return pathname === link.href;
  };

  return (
    <>
      <motion.nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 border-b shadow-sm backdrop-blur-xl'
            : 'bg-transparent text-[#1b2021]'
        }`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <LexoraLogo size="sm" />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 text-sm font-medium sm:flex">
            {NAV_LINKS.map((link) =>
              link.type === 'scroll' ? (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className={`cursor-pointer transition-colors ${
                    isLinkActive(link)
                      ? 'text-foreground'
                      : 'text-[#1b2021]/62 hover:text-[#1b2021]'
                  }`}
                >
                  {link.label}
                  {isLinkActive(link) && (
                    <motion.div
                      className="mt-0.5 h-0.5 rounded-full bg-[#a6a867]"
                      layoutId="navbar-indicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    isLinkActive(link)
                      ? 'text-foreground'
                      : 'text-[#1b2021]/62 hover:text-[#1b2021]'
                  }`}
                >
                  {link.label}
                  {isLinkActive(link) && (
                    <motion.div
                      className="mt-0.5 h-0.5 rounded-full bg-[#a6a867]"
                      layoutId="navbar-indicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => scrollTo('#get-started')}
              className="hidden border-[#51513d]/35 bg-[#e3dcc2]/55 text-[#1b2021] hover:bg-[#e3dc95]/55 sm:inline-flex"
            >
              Start Screening
            </Button>
            <div className="hidden sm:block">
              <UserNav />
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="hover:bg-muted flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors sm:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
              className="bg-background fixed top-16 right-0 bottom-0 z-40 w-72 border-l shadow-xl sm:hidden"
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
                      className={`cursor-pointer rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                        isLinkActive(link)
                          ? 'text-foreground bg-accent/10'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                        isLinkActive(link)
                          ? 'text-foreground bg-accent/10'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ),
                )}
                <div className="my-2 border-t" />
                <div className="px-4">
                  <UserNav />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
