'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getAdminAttempt,
  getAdminAttempts,
  getMyAttempt,
  getMyAttempts,
} from '@/features/attempts/api';
import type { AttemptFilters } from '@/features/attempts/types';

export function useMyAttempts(filters: AttemptFilters) {
  return useQuery({
    queryKey: ['attempts', 'mine', filters],
    queryFn: () => getMyAttempts(filters),
  });
}

export function useMyAttempt(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: ['attempts', 'mine', attemptId],
    queryFn: () => getMyAttempt(attemptId),
    enabled,
  });
}

export function useAdminAttempts(filters: AttemptFilters) {
  return useQuery({
    queryKey: ['attempts', 'admin', filters],
    queryFn: () => getAdminAttempts(filters),
  });
}

export function useAdminAttempt(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: ['attempts', 'admin', attemptId],
    queryFn: () => getAdminAttempt(attemptId),
    enabled,
  });
}
