import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';

/**
 * Marketing footer — Server Component (no 'use client').
 * Static content renders at build time for optimal SEO.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <LexoraLogo size="sm" />
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <span>© {year} Lexora</span>
          <span className="hidden sm:inline">•</span>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span className="hidden sm:inline">•</span>
          <span>Research Use Only</span>
          <a
            href="https://github.com/khalilelemam/eglex"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
