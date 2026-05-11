'use client';

import { useCallback, useState } from 'react';
import { Info } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { IntakeData } from '../types';

// ─── Validation ──────────────────────────────────────────
const intakeSchema = z.object({
  age: z
    .number({ error: 'Please enter a valid age.' })
    .int({ error: 'Age must be a whole number.' })
    .min(5, { error: 'Age must be at least 5.' })
    .max(25, { error: 'Age must be 25 or under.' }),
  label: z.string().max(100, 'Label must be 100 characters or fewer.').optional(),
});

type FieldErrors = Partial<Record<'age' | 'label', string>>;

// ─── Component ───────────────────────────────────────────
interface PreTestIntakeProps {
  onComplete: (data: IntakeData) => void;
}

/**
 * Pre-test step — collects the child's age (required) and an optional
 * session name before proceeding to the rest of the test flow.
 *
 * @see https://github.com/khalilelemam/eglex/issues/47
 */
export function PreTestIntake({ onComplete }: PreTestIntakeProps) {
  const [age, setAge] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = useCallback(
    (e: React.SubmitEvent) => {
      e.preventDefault();

      const raw = {
        age: age === '' ? undefined : Number(age),
        label: label.trim() || undefined,
      };

      const result = intakeSchema.safeParse(raw);

      if (!result.success) {
        const fieldErrors: FieldErrors = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof FieldErrors;
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      onComplete(result.data as IntakeData);
    },
    [age, label, onComplete],
  );

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Before We Begin</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Please provide a few details about the participant.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* ── Age ── */}
          <Field data-invalid={!!errors.age || undefined}>
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
              type="number"
              inputMode="numeric"
              min={1}
              max={18}
              placeholder="e.g. 10"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setErrors((prev) => ({ ...prev, age: undefined }));
              }}
              aria-invalid={!!errors.age || undefined}
            />

            {errors.age ? (
              <FieldError>{errors.age}</FieldError>
            ) : (
              <FieldDescription>
                Enter the child&apos;s age (5–25). Results are most accurate for ages 9–11.
              </FieldDescription>
            )}
          </Field>

          {/* ── Session Name ── */}
          <Field data-invalid={!!errors.label || undefined}>
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
                  generate one automatically (e.g. &quot;Test — May 11, 2026&quot;).
                </TooltipContent>
              </Tooltip>
            </FieldLabel>

            <Input
              id="intake-label"
              type="text"
              placeholder='e.g. "John&apos;s Test"'
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setErrors((prev) => ({ ...prev, label: undefined }));
              }}
              maxLength={100}
              aria-invalid={!!errors.label || undefined}
            />

            {errors.label ? (
              <FieldError>{errors.label}</FieldError>
            ) : (
              <FieldDescription>
                Optional — a name is generated automatically if left blank.
              </FieldDescription>
            )}
          </Field>

          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </TooltipProvider>
  );
}
