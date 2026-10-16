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
  { label: 'عن المبادرة', href: '#about' },
  { label: 'فيديو توضيحي', href: '#video' },
  { label: 'كيف يعمل الاختبار', href: '#how-it-works' },
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
              قائمة الانتظار والأبحاث
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

          {/* Action CTAs (No Login) */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/test/webcam">
              <Button
                variant="outline"
                size="sm"
                className="border-[#51513d]/30 bg-[#e3dcc2]/60 text-xs font-bold text-[#1b2021] hover:bg-[#e3dcc2]"
              >
                <Camera className="ml-1.5 h-3.5 w-3.5 text-[#51513d]" />
                تجربة القراءة
              </Button>
            </Link>

            <Link href="/waitlist">
              <Button
                size="sm"
                className="bg-[#51513d] text-xs font-bold text-[#e3dcc2] shadow-[4px_4px_0_rgba(81,81,61,.18)] hover:bg-[#1b2021] cursor-pointer"
              >
                <Sparkles className="ml-1.5 h-3.5 w-3.5 text-[#e3dc95]" />
                انضم للانتظار
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#1b2021] hover:text-[#51513d]"
            aria-label="القائمة"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#f3edd7] pt-24 px-6 pb-8 md:hidden flex flex-col justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            dir="rtl"
          >
            <div className="flex flex-col gap-6">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-right text-lg font-bold text-[#1b2021] border-b border-[#51513d]/10 pb-3"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-[#51513d]/20">
              <Link href="/waitlist" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-[#51513d] text-[#e3dcc2] font-bold py-3 text-sm">
                  <Sparkles className="ml-2 h-4 w-4 text-[#e3dc95]" />
                  انضم إلى قائمة الانتظار
                </Button>
              </Link>
              <Link href="/test/webcam" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full border-[#51513d]/30 font-bold py-3 text-sm">
                  <Camera className="ml-2 h-4 w-4 text-[#51513d]" />
                  تجربة اختبار القراءة السريع
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
