'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles, Camera } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { Button } from '@/components/ui/button';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'انضم للانتظار', href: '#waitlist' },
  { label: 'فيديو المبادرة', href: '#video' },
  { label: 'منهجية البحث', href: '#methodology' },
  { label: 'الأسئلة الشائعة', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = useCallback(
    (id: string) => {
      setMobileOpen(false);
      if (pathname !== '/') {
        window.location.href = `/${id}`;
        return;
      }
      const elId = id.startsWith('#') ? id.slice(1) : id;
      document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth' });
    },
    [pathname],
  );

  return (
    <>
      <motion.nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[#51513d]/18 bg-[#f3edd7]/92 shadow-[0_8px_30px_rgb(27,32,33,0.06)] backdrop-blur-md'
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        dir="rtl"
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <LexoraLogo size="sm" />
            <span className="hidden sm:inline-block rounded-full border border-[#51513d]/18 bg-[#e3dcc2]/70 px-2.5 py-0.5 text-[10px] font-bold text-[#51513d]">
              قائمة الانتظار والبحث العربي
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm font-bold text-[#1b2021]/75 transition-colors hover:text-[#1b2021] cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/test/webcam">
              <Button
                variant="outline"
                size="sm"
                className="border-[#51513d]/30 bg-[#e3dcc2]/60 text-xs font-bold text-[#1b2021] hover:bg-[#e3dcc2]"
              >
                <Camera className="ml-1.5 h-3.5 w-3.5 text-[#51513d]" />
                شارك في الاختبار
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => scrollTo('#waitlist')}
              className="bg-[#51513d] text-xs font-bold text-[#e3dcc2] shadow-[4px_4px_0_rgba(81,81,61,.18)] hover:bg-[#1b2021] cursor-pointer"
            >
              <Sparkles className="ml-1.5 h-3.5 w-3.5 text-[#e3dc95]" />
              سجّل الآن
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-10 w-10 items-center justify-center border border-[#51513d]/20 bg-[#e3dcc2] text-[#1b2021]"
            aria-label="القائمة الرئيسية"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-20 z-40 border-b border-[#51513d]/20 bg-[#f3edd7] p-6 shadow-xl md:hidden text-right"
            dir="rtl"
          >
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="py-2 text-base font-bold text-[#1b2021]/80 hover:text-[#1b2021] text-right"
                >
                  {link.label}
                </button>
              ))}

              <div className="mt-4 pt-4 border-t border-[#51513d]/15 flex flex-col gap-3">
                <Link href="/test/webcam" onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full h-11 border-[#51513d]/30 text-sm font-bold text-[#1b2021]"
                  >
                    <Camera className="ml-2 h-4 w-4" />
                    شارك في اختبار القراءة (3 دقائق)
                  </Button>
                </Link>

                <Button
                  onClick={() => scrollTo('#waitlist')}
                  className="w-full h-11 bg-[#51513d] text-sm font-bold text-[#e3dcc2]"
                >
                  <Sparkles className="ml-2 h-4 w-4 text-[#e3dc95]" />
                  انضم لقائمة الانتظار
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
