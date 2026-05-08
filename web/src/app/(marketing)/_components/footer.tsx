import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#e3dcc2]/10 bg-[#1b2021] px-6 py-9 text-[#e3dcc2]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
        <LexoraLogo
          size="sm"
          className="[&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
        />

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#e3dcc2]/58">
          <Link href="/about" className="transition-colors hover:text-[#e3dc95]">
            About
          </Link>
          <Link href="/faq" className="transition-colors hover:text-[#e3dc95]">
            FAQ
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[#e3dc95]">
            Privacy
          </Link>
          <a
            href="https://github.com/khalilelemam/eglex"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition-colors hover:text-[#e3dc95]"
          >
            GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#e3dcc2]/42">
          <span>© {year} Lexora</span>
          <span>·</span>
          <span>Research Use Only</span>
        </div>
      </div>
    </footer>
  );
}
