import { ExternalLink } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';

/**
 * Marketing footer — Server Component (no 'use client').
 * Static content renders at build time for optimal SEO.
 */
export function Footer() {
  // Use a build-time constant to avoid hydration mismatch near midnight
  const year = new Date().getFullYear();

  return (
    <footer className="py-8 px-6 border-t">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <LexoraLogo size="sm" />
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span>© {year} Lexora</span>
          <span>•</span>
          <span>Research Use Only</span>
          <span>•</span>
          <a
            href="https://github.com/khalilelemam/eglex"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
