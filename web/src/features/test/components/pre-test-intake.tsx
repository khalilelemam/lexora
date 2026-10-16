'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info, UserRoundCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';

import { LexoraLogo } from '@/components/shared/lexora-logo';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { IntakeData } from '../types';

const intakeSchema = z.object({
  age: z
    .string()
    .trim()
    .min(1, 'يرجى إدخال عمر الطفل (Please enter child age)')
    .regex(/^\d+$/, 'العمر يجب أن يحتوي على أرقام فقط')
    .transform(Number)
    .pipe(
      z
        .number()
        .int('العمر يجب أن يكون رقماً صحيحاً')
        .min(5, 'أقل عمر للمشاركة هو 5 سنوات')
        .max(25, 'أقصى عمر هو 25 سنة'),
    ),
  label: z
    .string()
    .trim()
    .max(100, 'الاسم يجب ألا يتجاوز 100 حرف')
    .transform((value) => value || undefined)
    .optional(),
  language: z.enum(['ar', 'en']).default('ar'),
});

type IntakeFormValues = z.input<typeof intakeSchema>;
type IntakeFormOutput = z.output<typeof intakeSchema>;

interface PreTestIntakeProps {
  onComplete: (data: IntakeData) => void;
}

export function PreTestIntake({ onComplete }: PreTestIntakeProps) {
  const searchParams = useSearchParams();
  const waitlistId = searchParams.get('waitlistId') || undefined;
  const initialAge = searchParams.get('age') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntakeFormValues, undefined, IntakeFormOutput>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      age: initialAge,
      label: '',
      language: 'ar',
    },
  });

  return (
    <TooltipProvider>
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[0.95fr_1.05fr]" dir="rtl">
        <section className="relative overflow-hidden border border-[#51513d]/18 bg-[#51513d] p-7 text-[#e3dcc2] shadow-[12px_12px_0_rgba(81,81,61,.12)] text-right">
          <div className="absolute top-0 left-0 h-24 w-24 -translate-x-8 -translate-y-8 rounded-full bg-[#a6a867]/24" />
          <LexoraLogo
            size="md"
            className="mb-14 [&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
          />
          <p className="mb-3 text-xs font-black tracking-[0.25em] text-[#e3dc95] uppercase">
            بيانات المشارك في التجربة
          </p>
          <h1 className="max-w-sm text-3xl sm:text-4xl leading-tight font-black text-balance">
            نبدأ بالطفل أولاً.
          </h1>
          <p className="mt-4 leading-7 text-[#e3dcc2]/80 text-sm sm:text-base">
            معرفة عمر الطفل تتيح لنا اختيار النصوص ومستوى المقاطع الصوتية المناسبة لقدراته الإدراكية، مما يضمن تجربة قراءة ممتعة وبيانات علمية دقيقة.
          </p>
        </section>

        <form
          onSubmit={handleSubmit((data) =>
            onComplete({
              ...data,
              waitlistEntryId: waitlistId,
            }),
          )}
          className="border border-[#51513d]/18 bg-[#f3edd7] p-7 shadow-[12px_12px_0_rgba(81,81,61,.1)] text-right"
        >
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#a6a867] text-[#1b2021]">
              <UserRoundCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1b2021]">قبل أن نبدأ</h2>
              <p className="mt-1 text-sm leading-6 text-[#1b2021]/65">
                أدخل عمر الطفل واسم الجلسة للبدء في المعايرة واختبار القراءة.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <Field data-invalid={errors.age ? true : undefined}>
              <FieldLabel htmlFor="intake-age" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1b2021]">
                عمر الطفل (بالسنوات) <span className="text-[#9e5a5a]">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer text-[#51513d]/65 hover:text-[#1b2021]"
                    >
                      <Info className="size-3.5" />
                      <span className="sr-only">معلومات العمر</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60 text-right">
                    يتم تكييف المقاطع الصوتية وقصص القراءة بناءً على المرحلة العمرية.
                  </TooltipContent>
                </Tooltip>
              </FieldLabel>

              <Input
                id="intake-age"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]*"
                placeholder="مثال: 9"
                className="border-[#51513d]/20 bg-[#e3dcc2] text-right"
                {...register('age')}
                aria-invalid={errors.age ? true : undefined}
              />

              {errors.age?.message ? (
                <FieldError className="text-right">{errors.age.message}</FieldError>
              ) : (
                <FieldDescription className="text-right text-xs">
                  أدخل عمر الطفل بين 5 و 25 سنة.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.label ? true : undefined}>
              <FieldLabel htmlFor="intake-label" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1b2021]">
                اسم الجلسة أو الملاحظات (اختياري)
              </FieldLabel>

              <Input
                id="intake-label"
                type="text"
                placeholder="مثال: قراءة تجريبية - أحمد"
                className="border-[#51513d]/20 bg-[#e3dcc2] text-right"
                {...register('label')}
                maxLength={100}
                aria-invalid={errors.label ? true : undefined}
              />

              {errors.label?.message ? (
                <FieldError className="text-right">{errors.label.message}</FieldError>
              ) : (
                <FieldDescription className="text-right text-xs">
                  يمكنك تركه فارغاً وسيتم تعيين معرّف تلقائي للجلسة.
                </FieldDescription>
              )}
            </Field>
          </div>

          <Button
            type="submit"
            className="mt-8 w-full h-12 bg-[#51513d] text-base font-bold text-[#e3dcc2] shadow-[5px_5px_0_rgba(81,81,61,.14)] hover:bg-[#1b2021]"
            disabled={isSubmitting}
          >
            المتابعة إلى تجهيز الكاميرا 🚀
          </Button>
        </form>
      </div>
    </TooltipProvider>
  );
}
