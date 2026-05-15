'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info, UserRoundCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
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

interface PreTestIntakeProps {
  onComplete: (data: IntakeData) => void;
}

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
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden border border-[#51513d]/18 bg-[#51513d] p-7 text-[#e3dcc2] shadow-[12px_12px_0_rgba(81,81,61,.12)]">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[#a6a867]/24" />
          <LexoraLogo
            size="md"
            className="mb-16 [&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
          />
          <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
            Participant setup
          </p>
          <h1 className="max-w-sm text-4xl leading-tight font-black text-balance">
            Start with the child, not the machine.
          </h1>
          <p className="mt-5 leading-7 text-[#e3dcc2]/70">
            Age helps Lexora choose the right calibration expectations and interpret the test
            session with the right context.
          </p>
        </section>

        <form
          onSubmit={handleSubmit((data) => onComplete(data))}
          className="border border-[#51513d]/18 bg-[#f3edd7] p-7 shadow-[12px_12px_0_rgba(81,81,61,.1)]"
        >
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#a6a867] text-[#1b2021]">
              <UserRoundCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1b2021]">Before we begin</h2>
              <p className="mt-2 text-sm leading-6 text-[#1b2021]/62">
                Add the minimum session details before calibration starts.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <Field data-invalid={errors.age ? true : undefined}>
              <FieldLabel htmlFor="intake-age" className="inline-flex items-center gap-1.5">
                Child&apos;s age <span className="text-[#9e5a5a]">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer text-[#51513d]/65 hover:text-[#1b2021]"
                    >
                      <Info className="size-3.5" />
                      <span className="sr-only">Age info</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60">
                    Model accuracy is strongest near the age range represented in training data.
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
                className="border-[#51513d]/20 bg-[#e3dcc2]"
                {...register('age')}
                aria-invalid={errors.age ? true : undefined}
              />

              {errors.age?.message ? (
                <FieldError>{errors.age.message}</FieldError>
              ) : (
                <FieldDescription>
                  Enter the child&apos;s age from 5 to 25. Results are most accurate for ages 9 to
                  11.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.label ? true : undefined}>
              <FieldLabel htmlFor="intake-label" className="inline-flex items-center gap-1.5">
                Session name
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer text-[#51513d]/65 hover:text-[#1b2021]"
                    >
                      <Info className="size-3.5" />
                      <span className="sr-only">Session name info</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60">
                    Add a label so guardians can find this attempt later. A name is generated if
                    left blank.
                  </TooltipContent>
                </Tooltip>
              </FieldLabel>

              <Input
                id="intake-label"
                type="text"
                placeholder="e.g. Morning screening"
                className="border-[#51513d]/20 bg-[#e3dcc2]"
                {...register('label')}
                maxLength={100}
                aria-invalid={errors.label ? true : undefined}
              />

              {errors.label?.message ? (
                <FieldError>{errors.label.message}</FieldError>
              ) : (
                <FieldDescription>
                  Optional. Useful for reports and attempt history.
                </FieldDescription>
              )}
            </Field>
          </div>

          <Button
            type="submit"
            className="mt-8 w-full bg-[#51513d] text-[#e3dcc2] hover:bg-[#1b2021]"
            disabled={isSubmitting}
          >
            Continue to instructions
          </Button>
        </form>
      </div>
    </TooltipProvider>
  );
}
