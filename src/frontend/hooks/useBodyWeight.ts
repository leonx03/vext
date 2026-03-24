/** Body weight hooks - React Query queries and mutations for body weight tracking. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as bodyWeightService from '@backend/services/bodyWeightService';
import { useDatabase } from '@frontend/hooks/useDatabase';

export function useBodyWeightHistory() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['bodyWeight', 'history'],
    queryFn: () => bodyWeightService.getHistory(db),
  });
}

export function useBodyWeightTrend(count: number = 30) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['bodyWeight', 'trend', count],
    queryFn: () => bodyWeightService.getRecentTrend(db, count),
  });
}

export function useLogBodyWeight() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weightKg, date, notes }: { weightKg: number; date: string; notes?: string | null }) =>
      bodyWeightService.logWeight(db, weightKg, date, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyWeight'] });
    },
  });
}

export function useDeleteBodyWeight() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bodyWeightService.deleteEntry(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyWeight'] });
    },
  });
}
