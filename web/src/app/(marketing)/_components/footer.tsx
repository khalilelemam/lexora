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
    <footer className="bg-card/30 px-6 py-8 border-t">
      <div className="flex flex-col items-center gap-4 mx-auto max-w-5xl">
        <LexoraLogo size="sm" />

        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-muted-foreground text-xs">
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
            href="https://github.com/khalilelemam/lexora"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/60">
          <span>© {year} Lexora</span>
          <span>·</span>
          <span>Research Use Only</span>
        </div>
      </div>
    </footer>
  );
}
