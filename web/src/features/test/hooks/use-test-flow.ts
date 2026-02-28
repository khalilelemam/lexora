'use client';

import { useReducer, useCallback } from 'react';
import type { TestFlowState, TestAction, Language } from '../types';
import {
  testFlowReducer,
  createTobiiInitialState,
  createWebcamInitialState,
} from '../lib/test-machine';
import type { TestMode } from '../types';

interface UseTestFlowOptions {
  mode: TestMode;
  language: Language;
}

export function useTestFlow({ mode, language }: UseTestFlowOptions) {
  const initialState: TestFlowState =
    mode === 'tobii' ? createTobiiInitialState(language) : createWebcamInitialState(language);

  const [state, dispatch] = useReducer(testFlowReducer, initialState);

  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, dispatch, start, reset };
}
