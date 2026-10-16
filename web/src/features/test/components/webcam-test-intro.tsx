'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, ShieldCheck, ArrowRight, UserCheck, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import type { IntakeData } from '../types';

interface WebcamTestIntroProps {
  initialWaitlistId?: string;
  initialAge?: number;
  initialName?: string;
  initialEmail?: string;
  onStart: (data: IntakeData) => void;
}

export function WebcamTestIntro({
  initialWaitlistId,
  initialAge,
  initialName,
  initialEmail,
  onStart,
}: WebcamTestIntroProps) {
  const [age, setAge] = useState<number>(initialAge && initialAge >= 5 && initialAge <= 16 ? initialAge : 9);
  const [waitlistId, setWaitlistId] = useState<string>(initialWaitlistId || '');
  const [name, setName] = useState<string>(initialName || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      age,
      language: 'ar',
      waitlistEntryId: waitlistId.trim() || undefined,
      label: name.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center py-6 px-4" dir="rtl">
      {/* Decorative Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <LexoraLogo size="md" className="mb-4" />
        <div className="inline-flex items-center gap-2 rounded-full border border-[#51513d]/20 bg-[#f3edd7]/80 px-4 py-1.5 text-xs font-bold text-[#51513d] shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#8b6f25]" />
          جلسة تجريبية لدعم وتطوير أول نموذج عربي لتحليل القراءة
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[12px_12px_0_rgba(81,81,61,.12)] sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-[#1b2021] sm:text-3xl md:text-4xl">
            مرحباً بكم في جلسة القراءة التفاعلية للأطفال
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#1b2021]/80 sm:text-base">
            شكراً لاهتمامكم بالمساهمة معنا. نهدف إلى جمع بيانات حركة العين أثناء القراءة لبناء نماذج ذكاء اصطناعي تفهم خصوصية لغتنا العربية وتساعد ملايين الأطفال.
          </p>
        </div>

        {/* 3 Steps Overview */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border border-[#51513d]/15 bg-[#e3dcc2]/45 p-4 transition-colors hover:bg-[#e3dcc2]/70">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#51513d]/20 bg-[#f3edd7] text-[#51513d] font-mono text-sm font-black mb-3">
              01
            </div>
            <h3 className="text-base font-bold text-[#1b2021]">تجهيز الكاميرا</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#51513d]">
              التأكد من جلوس الطفل أمام شاشة الحاسوب بإضاءة مريحة وواضحة.
            </p>
          </div>

          <div className="border border-[#51513d]/15 bg-[#e3dcc2]/45 p-4 transition-colors hover:bg-[#e3dcc2]/70">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#51513d]/20 bg-[#f3edd7] text-[#51513d] font-mono text-sm font-black mb-3">
              02
            </div>
            <h3 className="text-base font-bold text-[#1b2021]">المعايرة الذكية</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#51513d]">
              يتابع الطفل نقطة لطيفة متحركة على الشاشة لضبط دقة تتبع العينين.
            </p>
          </div>

          <div className="border border-[#51513d]/15 bg-[#e3dcc2]/45 p-4 transition-colors hover:bg-[#e3dcc2]/70">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#51513d]/20 bg-[#f3edd7] text-[#51513d] font-mono text-sm font-black mb-3">
              03
            </div>
            <h3 className="text-base font-bold text-[#1b2021]">3 نصوص ممتعة</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#51513d]">
              قراءة مقاطع صوتية بسيطة، كلمات تدريبية، ثم فقرة قصيرة وممتعة.
            </p>
          </div>
        </div>

        {/* Waitlist Binding Status Banner */}
        {initialWaitlistId ? (
          <div className="mt-6 flex items-center gap-3 border border-[#a6a867]/40 bg-[#a6a867]/15 p-4">
            <UserCheck className="h-6 w-6 text-[#51513d] shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-[#1b2021]">
                تم ربط الجلسة بطلب قائمة الانتظار بنجاح!
              </p>
              <p className="text-xs text-[#51513d] mt-0.5">
                معرف الطلب: <span className="font-mono font-bold text-[#1b2021]">{initialWaitlistId}</span>
                {name ? ` • المشارك: ${name}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 border border-[#51513d]/15 bg-[#e3dcc2]/30 p-4">
            <p className="text-xs font-bold text-[#51513d] mb-2">
              هل انضممت لقائمة الانتظار وترغب بربط هذه المساهمة بطلبك؟ (اختياري):
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold text-[#1b2021] mb-1">
                  معرّف طلب قائمة الانتظار أو اسم الطفل:
                </label>
                <input
                  type="text"
                  value={waitlistId || name}
                  onChange={(e) => {
                    setWaitlistId(e.target.value);
                    setName(e.target.value);
                  }}
                  placeholder="مثال: waitlist_xyz أو اسم طفلك"
                  className="w-full border border-[#51513d]/25 bg-[#f3edd7] px-3 py-2 text-xs text-[#1b2021] focus:border-[#51513d] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1b2021] mb-1">
                  عمر الطفل المشارك:
                </label>
                <select
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full border border-[#51513d]/25 bg-[#f3edd7] px-3 py-2 text-xs font-bold text-[#1b2021] focus:border-[#51513d] focus:outline-hidden"
                >
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((y) => (
                    <option key={y} value={y}>
                      {y} سنوات
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="mt-6 flex items-start gap-3 border border-[#51513d]/12 bg-[#f3edd7] p-4 text-xs text-[#51513d]">
          <ShieldCheck className="h-5 w-5 text-[#51513d] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#1b2021] block mb-0.5">خصوصية وأمان بيانات طفلك مضمونة 100%</strong>
            معالجة وتتبع العين تتم محلياً داخل المتصفح، ولا يتم إرسال أو تسجيل أي صورة أو فيديو لوجه الطفل إطلاقاً إلى خوادمنا. ما يتم حفظه فقط هو إحداثيات نقاط النظر التقريبية للنصوص.
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-8 flex flex-col items-center">
          <Button
            onClick={handleSubmit}
            size="lg"
            className="w-full max-w-md bg-[#51513d] py-6 text-base font-black text-[#f3edd7] shadow-[6px_6px_0_#1b2021] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#1b2021] hover:shadow-[4px_4px_0_#1b2021]"
          >
            <span>بدء تجهيز الكاميرا والانطلاق</span>
            <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
          </Button>
          <p className="mt-3 text-center text-[11px] text-[#51513d]/70">
            تستغرق الجلسة قرابة 3 إلى 4 دقائق فقط، ويمكنكم التوقف في أي وقت.
          </p>
        </div>
      </div>
    </div>
  );
}
