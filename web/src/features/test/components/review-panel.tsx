'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, RotateCcw, ArrowRight, AlertTriangle, Eye } from 'lucide-react';
import { MIN_GAZE_POINTS } from '../lib/constants';
import { calculateReadingAnalysis } from '../lib/gaze-analysis';
import { FullscreenRawGazeReplay } from './fullscreen-gaze-replay';
import type { WebcamGazePoint } from '../types';

interface ReviewPanelProps {
  taskType: string;
  pointCount: number;
  isLastTask: boolean;
  onRetake: () => void;
  onContinue: () => void;
  /** The reading content that was shown during the task */
  readingContent?: string;
  /** Raw gaze data collected during the reading task (screen-pixel coords) */
  rawGazeData?: WebcamGazePoint[];
}

/**
 * Post-task review screen.
 *
 * Default view: centered status card with data quality info.
 * "View Gaze Trail" button: expands to fullscreen TaskDisplay (preview mode)
 * with raw gaze trail replaying over the text.
 */
export function ReviewPanel({
  taskType,
  pointCount,
  isLastTask,
  onRetake,
  onContinue,
  readingContent,
  rawGazeData: rawGazeDataProp,
}: ReviewPanelProps) {
  const hasEnoughData = pointCount >= MIN_GAZE_POINTS;

  // Stabilize to avoid re-renders on every parent render
  const rawGazeData = useMemo(() => rawGazeDataProp ?? [], [rawGazeDataProp]);

  const readingAnalysis = useMemo(
    () => calculateReadingAnalysis(readingContent, rawGazeData),
    [readingContent, rawGazeData],
  );

  // ── Gaze preview state ──
  const [showGazePreview, setShowGazePreview] = useState(false);

  // ═══════════════════════════════════════════════════════
  //  FULLSCREEN GAZE PREVIEW
  // ═══════════════════════════════════════════════════════
  if (showGazePreview && readingContent) {
    return (
      <FullscreenRawGazeReplay
        taskType={taskType}
        content={readingContent}
        points={rawGazeData}
        coordinateSpace="screen-pixels"
        title="Child vision replay"
        onClose={() => setShowGazePreview(false)}
      />
    );
  }

  const isArabic = /[\u0600-\u06FF]/.test(readingContent || '');

  // ═══════════════════════════════════════════════════════
  //  DEFAULT VIEW — Status card
  // ═══════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center justify-center overflow-hidden bg-[#e3dcc2] p-6 text-[#1b2021] md:p-12"
      style={{ animation: 'float-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-[#e3dc95]/40 blur-[100px]" />
      </div>

      <div className="relative z-10 flex max-h-[90dvh] min-h-0 w-full max-w-5xl flex-col border border-[#51513d]/20 bg-[#f3edd7] shadow-[12px_12px_0_rgba(81,81,61,.14)]">
        {/* Header - Fixed at top */}
        <div className="flex shrink-0 flex-col items-center border-b border-[#51513d]/18 bg-[#e3dcc2]/40 p-6 text-center md:p-8">
          {hasEnoughData ? (
            <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[#a6a867] text-[#1b2021]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          ) : (
            <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[#e3dc95] text-[#1b2021]">
              <AlertTriangle className="h-6 w-6" />
            </div>
          )}

          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            {hasEnoughData
              ? isArabic
                ? 'قراءة رائعة! 🌟'
                : 'Wonderful reading!'
              : isArabic
                ? 'واجهنا صعوبة بسيطة في تتبع حركة العين.'
                : 'We had a little trouble seeing you.'}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#1b2021]/70">
            {hasEnoughData
              ? isArabic
                ? 'تم التقاط مسار حركة العين بوضوح خلال هذه المرحلة.'
                : "We've successfully captured a clear picture of your eye movements."
              : isArabic
                ? 'يمكنك المتابعة، أو إعادة قراءة المقطع لجمع بيانات أكثر دقة.'
                : 'You can submit this attempt, or try reading the paragraph once more for better results.'}
          </p>
        </div>

        {/* 2-Column Split Content - Scrollable if needed */}
        <div className="flex min-h-0 flex-col overflow-y-auto md:flex-row">
          {/* Left Side: Stats Grid */}
          <div className="flex-1 border-b border-[#51513d]/18 p-6 md:border-r md:border-b-0 md:p-8">
            <h3 className="mb-6 text-center text-xs font-black tracking-widest text-[#51513d] uppercase md:text-right">
              {isArabic ? 'مؤشرات القراءة الأساسية' : 'Key Metrics'}
            </h3>
            {readingAnalysis && (
              <div className="mx-auto grid max-w-sm grid-cols-2 gap-px border border-[#51513d]/18 bg-[#51513d]/18 shadow-sm">
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    {isArabic ? 'سرعة القراءة' : 'Reading Speed'}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {readingAnalysis.readingWpm}{' '}
                    <span className="text-[10px] font-bold text-[#51513d]/60">
                      {isArabic ? 'كلمة/د' : 'WPM'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    {isArabic ? 'زمن التثبيت' : 'Focus Time'}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {readingAnalysis.avgFixationMs}{' '}
                    <span className="text-[10px] font-bold text-[#51513d]/60">
                      {isArabic ? 'مللي ثانية' : 'MS'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    {isArabic ? 'مرات التراجع' : 'Re-reads'}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {readingAnalysis.regressionCount}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    {isArabic ? 'الوقت المستغرق' : 'Total Time'}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {readingAnalysis.totalSeconds}{' '}
                    <span className="text-[10px] font-bold text-[#51513d]/60">
                      {isArabic ? 'ثانية' : 'SEC'}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Insights */}
          <div className="flex-1 bg-[#e3dcc2]/30 p-6 shadow-inner md:p-8">
            <h3 className="mb-6 text-center text-xs font-black tracking-widest text-[#51513d] uppercase md:text-right">
              {isArabic ? 'ملاحظات القراءة والتركيز' : 'Your Reading Insights'}
            </h3>
            {readingAnalysis && (
              <div className="flex flex-col gap-5 text-sm leading-relaxed font-medium text-[#1b2021] md:text-[15px] text-right">
                <p>
                  {isArabic ? (
                    readingAnalysis.readingWpm > 180 ? (
                      <>
                        انطلق طفلك في القراءة بسرعة لافتة بلغت{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.readingWpm} كلمة في الدقيقة
                        </strong>
                        ، منهياً قراءة النص في غضون{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.totalSeconds} ثانية
                        </strong>
                        .
                      </>
                    ) : readingAnalysis.readingWpm > 90 ? (
                      <>
                        قرأ طفلك بوتيرة متوازنة وطبيعية بلغت{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.readingWpm} كلمة في الدقيقة
                        </strong>
                        ، وأتم النص بالكامل خلال{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.totalSeconds} ثانية
                        </strong>
                        .
                      </>
                    ) : (
                      <>
                        قرأ طفلك بتمهل وتركيز متأنٍ بلغت سرعته{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.readingWpm} كلمة في الدقيقة
                        </strong>
                        ، مستغرقاً{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.totalSeconds} ثانية
                        </strong>
                        .
                      </>
                    )
                  ) : (
                    <>
                      {readingAnalysis.readingWpm > 200 ? (
                        <>You blazed through the text at a fast </>
                      ) : readingAnalysis.readingWpm > 120 ? (
                        <>You read at a steady, conversational pace of </>
                      ) : (
                        <>You took your time, reading at a careful pace of </>
                      )}
                      <strong className="font-black text-[#51513d]">
                        {readingAnalysis.readingWpm} words per minute
                      </strong>
                      , completing the entire passage in just{' '}
                      <strong className="font-black text-[#51513d]">
                        {readingAnalysis.totalSeconds} seconds
                      </strong>
                      .
                    </>
                  )}
                </p>
                <p>
                  {isArabic ? (
                    readingAnalysis.avgFixationMs < 200 ? (
                      <>
                        تنقلت عيناه بخفة وسرعة بين الكلمات، بمتوسط زمن تثبيت قدره{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.avgFixationMs} مللي ثانية
                        </strong>{' '}
                        على كل نقطة نظر.
                      </>
                    ) : readingAnalysis.avgFixationMs < 320 ? (
                      <>
                        أظهر إيقاع نظر صحي وطبيعي جداً، بمتوسط زمن تثبيت قدره{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.avgFixationMs} مللي ثانية
                        </strong>{' '}
                        لكل نقطة.
                      </>
                    ) : (
                      <>
                        أبدى تركيزاً عميقاً في معالجة الحروف والكلمات، بمتوسط زمن تثبيت{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.avgFixationMs} مللي ثانية
                        </strong>{' '}
                        على نقاط التثبيت.
                      </>
                    )
                  ) : (
                    <>
                      {readingAnalysis.avgFixationMs < 200 ? (
                        <>Your eyes scanned quickly, spending only </>
                      ) : readingAnalysis.avgFixationMs < 300 ? (
                        <>You maintained a very typical and healthy rhythm, spending </>
                      ) : (
                        <>You were deeply processing the words, spending </>
                      )}
                      <strong className="font-black text-[#51513d]">
                        {readingAnalysis.avgFixationMs}ms
                      </strong>{' '}
                      on average focusing on each point.
                    </>
                  )}
                </p>
                <p>
                  {isArabic ? (
                    readingAnalysis.regressionCount === 0 ? (
                      <>
                        رائع جداً! حافظ الطفل على{' '}
                        <strong className="font-black text-[#51513d]">مسار قراءة أمامي مستمر</strong>{' '}
                        دون الحاجة للعودة للوراء لإعادة قراءة أي كلمة.
                      </>
                    ) : readingAnalysis.regressionCount <= 3 ? (
                      <>
                        تراجع للوراء لإعادة التأكد من بعض الكلمات{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.regressionCount} {readingAnalysis.regressionCount === 1 ? 'مرة فقط' : 'مرات'}
                        </strong>
                        ، وهو مؤشر ممتاز على تدقيق الاستيعاب والفهم القرائي.
                      </>
                    ) : (
                      <>
                        أعاد النظر وتراجع للوراء{' '}
                        <strong className="font-black text-[#51513d]">
                          {readingAnalysis.regressionCount} مرات
                        </strong>
                        ، وهي استراتيجية طبيعية يلجأ إليها الطفل لتثبيت المعنى والتأكد من تهجئة الكلمات.
                      </>
                    )
                  ) : (
                    <>
                      {readingAnalysis.regressionCount === 0 ? (
                        <>
                          Incredibly, you did not jump backward to re-read at all! You maintained{' '}
                          <strong className="font-black text-[#51513d]">
                            perfect forward momentum
                          </strong>
                          .
                        </>
                      ) : readingAnalysis.regressionCount <= 3 ? (
                        <>
                          You only had to backtrack and re-read{' '}
                          <strong className="font-black text-[#51513d]">
                            {readingAnalysis.regressionCount} time
                            {readingAnalysis.regressionCount > 1 ? 's' : ''}
                          </strong>
                          , showing very strong comprehension.
                        </>
                      ) : (
                        <>
                          We noticed you naturally jumped back to re-read{' '}
                          <strong className="font-black text-[#51513d]">
                            {readingAnalysis.regressionCount} times
                          </strong>
                          , which is a great strategy for double-checking meaning.
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer Area */}
        <div className="flex shrink-0 flex-col gap-4 border-t border-[#51513d]/10 bg-[#f3edd7] p-4 md:px-10 md:py-6">
          {/* Controls */}
          <div className="flex flex-col items-stretch gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onRetake}
              className="flex flex-1 items-center justify-center gap-2 border border-[#51513d]/25 bg-[#e3dcc2] px-6 py-4 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10 active:translate-y-px active:shadow-none"
            >
              <RotateCcw className="h-4 w-4" />
              {isArabic ? 'إعادة المحاولة' : 'Read Again'}
            </button>
            <button
              type="button"
              onClick={() => setShowGazePreview(true)}
              disabled={rawGazeData.length < 2 || !readingContent}
              className="flex flex-1 items-center justify-center gap-2 border-2 border-[#1b2021] bg-[#a6a867] px-6 py-4 text-sm font-black text-[#1b2021] shadow-[4px_4px_0_0_#1b2021] transition-colors hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1b2021]"
            >
              <Eye className="h-4 w-4" />
              {isArabic ? 'شاهد مسار حركة عين طفلك 👁️' : 'See my child vision'}
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex flex-1 items-center justify-center gap-2 bg-[#51513d] px-6 py-4 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021] active:translate-y-px active:shadow-none"
            >
              {isArabic
                ? isLastTask
                  ? 'حفظ البيانات وإنهاء الاختبار'
                  : 'المرحلة التالية'
                : isLastTask
                  ? 'Submit for Analysis'
                  : 'Next Task'}
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          </div>

          {/* Eye Tracking Visualization Toggle */}
          {rawGazeData.length > 1 && readingContent && (
            <button
              type="button"
              onClick={() => setShowGazePreview(true)}
              className="mx-auto flex items-center gap-2 text-xs font-black tracking-widest text-[#51513d]/70 transition-colors hover:text-[#51513d]"
            >
              <Eye className="h-4 w-4" />
              {isArabic ? 'عرض تفصيلي لمسار حركة العين' : 'Eye Tracking Visualization'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
