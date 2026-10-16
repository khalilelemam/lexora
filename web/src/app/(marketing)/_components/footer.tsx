import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#e3dcc2]/10 bg-[#1b2021] px-6 py-10 text-[#e3dcc2]" dir="rtl">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
        <LexoraLogo
          size="sm"
          className="[&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
        />

        <p className="max-w-xl text-xs text-[#e3dcc2]/65 leading-relaxed">
          منصة ليكسورا هي مبادرة بحثية تقنية متخصصة في تحليل حركة العين ودعم مهارات القراءة باللغة العربية. البيانات المجمعة مخصصة للأغراض البحثية والتطويرية الأكاديمية.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#e3dcc2]/70 font-medium">
          <Link href="#waitlist" className="transition-colors hover:text-[#e3dc95]">
            قائمة الانتظار
          </Link>
          <Link href="#video" className="transition-colors hover:text-[#e3dc95]">
            فيديو المبادرة
          </Link>
          <Link href="#methodology" className="transition-colors hover:text-[#e3dc95]">
            منهجية القياس
          </Link>
          <Link href="#faq" className="transition-colors hover:text-[#e3dc95]">
            الأسئلة الشائعة
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[#e3dc95]">
            الخصوصية والشروط
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#e3dcc2]/45 border-t border-[#e3dcc2]/10 pt-4 w-full">
          <span>© {year} ليكسورا (Lexora) — جميع الحقوق محفوظة</span>
          <span>·</span>
          <span>لأغراض البحث العلمي والتطوير</span>
        </div>
      </div>
    </footer>
  );
}
