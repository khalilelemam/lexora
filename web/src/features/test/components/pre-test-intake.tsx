'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { IntakeData } from '../types';

// ─── Validation ──────────────────────────────────────────
const intakeSchema = z.object({
  age: z
    .string()
    .trim()
    .min(1, "Please enter the child's age.")
    .regex(/^\d+$/, 'Age must contain digits only.')
    .transform(Number)
    .pipe(
      z
        .number()
        .int('Age must be a whole number.')
        .min(5, 'Age must be at least 5.')
        .max(25, 'Age must be 25 or under.'),
    ),
  label: z
    .string()
    .trim()
    .max(100, 'Label must be 100 characters or fewer.')
    .transform((value) => value || undefined)
    .optional(),
});

type IntakeFormValues = z.input<typeof intakeSchema>;
type IntakeFormOutput = z.output<typeof intakeSchema>;

// ─── Component ───────────────────────────────────────────
interface PreTestIntakeProps {
  onComplete: (data: IntakeData) => void;
}

/**
 * Pre-test step — collects the child's age (required) and an optional
 * session name before proceeding to the rest of the test flow.
 *
 * @see https://github.com/khalilelemam/lexora/issues/47
 */
export function PreTestIntake({ onComplete }: PreTestIntakeProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntakeFormValues, undefined, IntakeFormOutput>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      age: '',
      label: '',
    },
  });

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Before We Begin</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Please provide a few details about the participant.
          </p>
        </div>

        <form onSubmit={handleSubmit((data) => onComplete(data))} className="w-full space-y-5">
          {/* ── Age ── */}
          <Field data-invalid={errors.age ? true : undefined}>
            <FieldLabel htmlFor="intake-age" className="inline-flex items-center gap-1.5">
              Child&apos;s Age <span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Info className="size-3.5" />
                    <span className="sr-only">Age info</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-60">
                  Our models were trained on data from children around ages 9–11, so accuracy tends
                  to be highest in that range.
                </TooltipContent>
              </Tooltip>
            </FieldLabel>

            <Input
              id="intake-age"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              placeholder="e.g. 10"
              {...register('age')}
              aria-invalid={errors.age ? true : undefined}
            />

            {errors.age?.message ? (
              <FieldError>{errors.age.message}</FieldError>
            ) : (
              <FieldDescription>
                Enter the child&apos;s age (5–25). Results are most accurate for ages 9–11.
              </FieldDescription>
            )}
          </Field>

          {/* ── Session Name ── */}
          <Field data-invalid={errors.label ? true : undefined}>
            <FieldLabel htmlFor="intake-label" className="inline-flex items-center gap-1.5">
              Session Name
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Info className="size-3.5" />
                    <span className="sr-only">Session name info</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-60">
                  Give this test a name so you can find it later. If you leave it blank, we&apos;ll
                  generate one automatically (e.g. &quot;Webcam Paragraph - 2026-05-14 18:10
                  UTC&quot;).
                </TooltipContent>
              </Tooltip>
            </FieldLabel>

            <Input
              id="intake-label"
              type="text"
              placeholder='e.g. "John&apos;s Test"'
              {...register('label')}
              maxLength={100}
              aria-invalid={errors.label ? true : undefined}
            />

            {errors.label?.message ? (
              <FieldError>{errors.label.message}</FieldError>
            ) : (
              <FieldDescription>
                Optional — a name is generated automatically if left blank.
              </FieldDescription>
            )}
          </Field>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Continue
          </Button>
        </form>
      </div>
    </TooltipProvider>
  );
}
