'use client';

import { useCallback, useRef } from 'react';

export function useStableAttemptId() {
  const attemptIdRef = useRef<string | null>(null);

  const getOrCreateAttemptId = useCallback(() => {
    if (!attemptIdRef.current) {
      attemptIdRef.current = crypto.randomUUID();
    }

    return attemptIdRef.current;
  }, []);

  const resetAttemptId = useCallback(() => {
    attemptIdRef.current = null;
  }, []);

  return {
    getOrCreateAttemptId,
    resetAttemptId,
  };
}
