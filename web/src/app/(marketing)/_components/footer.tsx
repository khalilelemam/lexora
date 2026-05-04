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
    <footer className="py-8 px-6 border-t bg-card/30">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
        <LexoraLogo size="sm" />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <a
            href="https://github.com/khalilelemam/eglex"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/60">
          <span>© {year} Lexora</span>
          <span>·</span>
          <span>Research Use Only</span>
        </div>
      </div>
    </footer>
  );
}
