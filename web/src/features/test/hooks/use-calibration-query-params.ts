'use client';

import { useMemo } from 'react';

import type { CalibrationVisualMode } from '../lib/calibration-mode';
import { parseCalibrationMode } from '../lib/parse-calibration-mode';

export interface CalibrationQueryParams {
  mode: CalibrationVisualMode | undefined;
  age: number | undefined;
  waitlistId: string | undefined;
  name: string | undefined;
  email: string | undefined;
}

export function useCalibrationQueryParams(): CalibrationQueryParams {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        mode: undefined,
        age: undefined,
        waitlistId: undefined,
        name: undefined,
        email: undefined,
      };
    }

    const params = new URLSearchParams(window.location.search);
    const parsedMode = parseCalibrationMode(params.get('calibrationMode'));
    const parsedAge = Number(params.get('age'));
    const waitlistId = params.get('waitlistId') || undefined;
    const name = params.get('name') || undefined;
    const email = params.get('email') || undefined;

    return {
      mode: parsedMode,
      age: Number.isFinite(parsedAge) ? parsedAge : undefined,
      waitlistId,
      name,
      email,
    };
  }, []);
}

