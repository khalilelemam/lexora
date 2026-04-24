'use client';

import { useReducer, useCallback } from 'react';
import type { TestFlowState } from '../types';
import {
  testFlowReducer,
  createTobiiInitialState,
  createWebcamInitialState,
} from '../lib/test-machine';
import type { TestMode } from '../types';

interface UseTestFlowOptions {
  mode: TestMode;
}

export function useTestFlow({ mode }: UseTestFlowOptions) {
  const initialState: TestFlowState =
    mode === 'tobii' ? createTobiiInitialState() : createWebcamInitialState();

  const [state, dispatch] = useReducer(testFlowReducer, initialState);

  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, dispatch, start, reset };
}
