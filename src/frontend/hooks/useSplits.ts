/** Split hooks - React Query queries and mutations for workout split planning. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as splitService from '@backend/services/splitService';
import * as workoutSeriesModel from '@backend/models/workoutSeries';
import { useDatabase } from '@frontend/hooks/useDatabase';
import type { SplitDayType } from '@shared/types/split';

export function useSplits() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['splits'],
    queryFn: () => splitService.getSplits(db),
  });
}

export function useSplitFull(splitId: string | null) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['splits', splitId],
    queryFn: () => splitService.getSplitFull(db, splitId!),
    enabled: !!splitId,
  });
}

/** All series (templates), including those with no completed history — for the day picker. */
export function useAllSeries() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['workoutSeries', 'all'],
    queryFn: () => workoutSeriesModel.getAll(db),
  });
}

export function useSeriesTemplate(seriesId: string | null, seriesName: string) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['seriesTemplate', seriesId],
    queryFn: () => splitService.getSeriesTemplate(db, seriesId!, seriesName),
    enabled: !!seriesId,
  });
}

export function useCreateSplit() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string | null }) =>
      splitService.createSplit(db, name, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['splits'] }),
  });
}

export function useUpdateSplit() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, description }: { id: string; name?: string; description?: string | null }) =>
      splitService.updateSplit(db, id, { name, description }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['splits'] }),
  });
}

export function useDeleteSplit() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => splitService.deleteSplit(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] });
    },
  });
}

export function useAddSplitDay() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ splitId, dayType, seriesId }: { splitId: string; dayType: SplitDayType; seriesId?: string | null }) =>
      splitService.addDay(db, splitId, dayType, seriesId),
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['splits', vars.splitId] }),
  });
}

export function useUpdateSplitDay() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, dayType, seriesId, label }: { splitId: string; dayId: string; dayType?: SplitDayType; seriesId?: string | null; label?: string | null }) =>
      splitService.updateDay(db, dayId, { dayType, seriesId, label }),
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['splits', vars.splitId] }),
  });
}

export function useRemoveSplitDay() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId }: { splitId: string; dayId: string }) => splitService.removeDay(db, dayId),
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['splits', vars.splitId] }),
  });
}

export function useReorderSplitDays() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds }: { splitId: string; orderedIds: string[] }) =>
      splitService.reorderDays(db, orderedIds),
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['splits', vars.splitId] }),
  });
}

export function useApplySplit() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ splitId, startDate, cycles }: { splitId: string; startDate: string; cycles: number }) =>
      splitService.applySplit(db, splitId, startDate, cycles),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] }),
  });
}

export function useClearAppliedSplit() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ splitId }: { splitId: string }) => splitService.clearAppliedSplit(db, splitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] }),
  });
}
