'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Home,
  Share2,
  Eye,
  Award,
  Layers,
  FileCheck,
} from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { Button } from '@/components/ui/button';
import type { DataCollectionResult } from '../types';

interface ResultsDisplayProps {
  result: DataCollectionResult;
  onNewTest: () => void;
}

export function ResultsDisplay({ result, onNewTest }: ResultsDisplayProps) {
  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: 'مبادرة ليكسورا لأبحاث القراءة وتتبع العين للأطفال',
        text: 'شاركت اليوم مع طفلي في تجربة ليكسورا لجمع بيانات تتبع حركة العين لدعم أبحاث القراءة باللغة العربية!',
        url: window.location.origin,
      });
    } else {
      void navigator.clipboard.writeText(window.location.origin);
      alert('تم نسخ رابط المبادرة إلى الحافظة!');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#e3dcc2] text-[#1b2021]" dir="rtl">
      {/* Top Bar */}
      <header className="border-b border-[#51513d]/18 bg-[#f3edd7]/85 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <LexoraLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            <span className="text-xs font-bold text-[#51513d]">تم حفظ البيانات على الخادم</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div
          className="w-full border border-[#51513d]/18 bg-[#f3edd7] p-8 shadow-[12px_12px_0_rgba(81,81,61,.14)] sm:p-12 text-center"
          style={{ animation: 'float-up 0.5s ease-out' }}
        >
          {/* Badge Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#51513d] bg-[#e3dcc2] shadow-[6px_6px_0_rgba(81,81,61,.18)]">
            <Award className="h-10 w-10 text-[#51513d]" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#51513d]/20 bg-[#e3dcc2]/60 px-4 py-1 text-xs font-bold text-[#51513d] mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[#8b6f25]" />
            مساهمة بحثية قيّمة مكتملة
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#1b2021] sm:text-4xl md:text-5xl">
            شكراً جزيلاً لمشاركتكم! 🌟
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#1b2021]/80 sm:text-lg">
            تم تسجيل وحفظ بيانات تتبع حركة العين ومراحل القراءة الثلاث بنجاح. مشاركة طفلك اليوم تساهم بشكل مباشر في تدريب وتطوير أول نموذج ذكاء اصطناعي عربي متخصص في تحليل المهارات القرائية.
          </p>

          {/* Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 text-right">
            <div className="border border-[#51513d]/14 bg-[#e3dcc2]/45 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#51513d]">
                <Eye className="h-4 w-4" />
                إجمالي النقاط
              </div>
              <p className="mt-2 text-2xl font-black text-[#1b2021]">
                {result?.totalGazePoints ?? 0}
              </p>
              <p className="text-[11px] text-[#1b2021]/60">نقطة تتبع مسجلة</p>
            </div>

            <div className="border border-[#51513d]/14 bg-[#e3dcc2]/45 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#51513d]">
                <Layers className="h-4 w-4" />
                المقاطع الصوتية
              </div>
              <p className="mt-2 text-2xl font-black text-[#1b2021]">
                {result?.taskCounts?.syllables ?? 0}
              </p>
              <p className="text-[11px] text-[#1b2021]/60">فك الترميز الصوتي</p>
            </div>

            <div className="border border-[#51513d]/14 bg-[#e3dcc2]/45 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#51513d]">
                <Layers className="h-4 w-4" />
                الكلمات غير الحقيقية
              </div>
              <p className="mt-2 text-2xl font-black text-[#1b2021]">
                {result?.taskCounts?.pseudoWords ?? 0}
              </p>
              <p className="text-[11px] text-[#1b2021]/60">التحويل الفونولوجي</p>
            </div>

            <div className="border border-[#51513d]/14 bg-[#e3dcc2]/45 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#51513d]">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                النص الهادف
              </div>
              <p className="mt-2 text-2xl font-black text-[#1b2021]">
                {result?.taskCounts?.meaningfulText ?? 0}
              </p>
              <p className="text-[11px] text-[#1b2021]/60">الانسيابية والسياق</p>
            </div>
          </div>

          {/* Reference Info */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[#51513d]/12 bg-[#e3dcc2]/30 px-4 py-3 text-xs text-[#51513d]">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span>معرّف الجلسة:</span>
              <code className="font-mono font-bold text-[#1b2021]">{result?.attemptId?.slice(0, 16)}...</code>
            </div>
            <div>
              <span>جودة المعايرة: </span>
              <strong className="text-[#1b2021]">
                {result?.calibrationQuality === 'good' ? 'ممتازة (Good)' : 'مقبولة (Acceptable)'}
              </strong>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 bg-[#51513d] text-sm font-black text-[#e3dcc2] shadow-[5px_5px_0_rgba(81,81,61,.16)] hover:bg-[#1b2021]"
              >
                <Home className="ml-2 h-4 w-4" />
                العودة للصفحة الرئيسية
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              onClick={onNewTest}
              className="w-full sm:w-auto h-12 border-[#51513d]/30 bg-[#f3edd7] text-sm font-bold text-[#51513d] hover:bg-[#e3dcc2]"
            >
              <RotateCcw className="ml-2 h-4 w-4" />
              إجراء اختبار لطفل آخر
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="w-full sm:w-auto h-12 border-[#51513d]/30 bg-[#f3edd7] text-sm font-bold text-[#51513d] hover:bg-[#e3dcc2]"
            >
              <Share2 className="ml-2 h-4 w-4" />
              مشاركة المبادرة
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
