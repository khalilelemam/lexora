'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteMyAttempt,
  getAdminAttempt,
  getAdminAttempts,
  getMyAttempt,
  getMyAttempts,
} from '@/features/attempts/api';
import type { AttemptFilters } from '@/features/attempts/types';

export function useMyAttempts(filters: AttemptFilters) {
  return useInfiniteQuery({
    queryKey: ['attempts', 'mine', filters],
    queryFn: ({ pageParam }) => getMyAttempts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
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
  return useInfiniteQuery({
    queryKey: ['attempts', 'admin', filters],
    queryFn: ({ pageParam }) => getAdminAttempts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useAdminAttempt(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: ['attempts', 'admin', attemptId],
    queryFn: () => getAdminAttempt(attemptId),
    enabled,
  });
}

export function useDeleteMyAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMyAttempt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attempts', 'mine'] });
    },
  });
}
