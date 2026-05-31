'use client';

import { useMemo } from 'react';

import type { CalibrationVisualMode } from './use-calibration-engine';
import { parseCalibrationMode } from '../lib/parse-calibration-mode';

export interface CalibrationQueryParams {
  mode: CalibrationVisualMode | undefined;
  age: number | undefined;
}

export function useCalibrationQueryParams(): CalibrationQueryParams {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        mode: undefined,
        age: undefined,
      };
    }

    const params = new URLSearchParams(window.location.search);
    const parsedMode = parseCalibrationMode(params.get('calibrationMode'));
    const parsedAge = Number(params.get('age'));

    return {
      mode: parsedMode,
      age: Number.isFinite(parsedAge) ? parsedAge : undefined,
    };
  }, []);
}
