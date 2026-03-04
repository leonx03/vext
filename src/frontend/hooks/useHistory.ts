/** History hooks - React Query queries for workout history, summaries, and previous sets. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as workoutService from '@backend/services/workoutService';
import { useDatabase } from '@frontend/hooks/useDatabase';
import { APP_CONFIG } from '@config/app';
import type { WorkoutSet, WorkoutFull } from '@shared/types/workout';

export function useWorkoutHistory() {
  const db = useDatabase();
  const pageSize = APP_CONFIG.defaults.historyPageSize;

  return useInfiniteQuery({
    queryKey: ['workoutHistory'],
    queryFn: ({ pageParam = 0 }) =>
      workoutService.getWorkoutSummaries(db, pageSize, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });
}

export function useWorkoutHistoryCount() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['workoutHistoryCount'],
    queryFn: () => workoutService.getWorkoutSummaryCount(db),
    staleTime: 60 * 1000,
  });
}

export function useWorkoutDetail(workoutId: string | null) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => workoutService.getFullWorkout(db, workoutId!),
    enabled: !!workoutId,
  });
}

/**
 * Batch-fetches previous sets for multiple exercises at once.
 * Returns a Map<exerciseId, WorkoutSet[]>.
 */
export function useWorkoutGroupDetails(workoutIds: string[]) {
  const db = useDatabase();
  return useQuery<WorkoutFull[]>({
    queryKey: ['workoutGroupDetails', ...workoutIds],
    queryFn: () => workoutService.getFullWorkoutsByIds(db, workoutIds),
    enabled: workoutIds.length > 0,
  });
}

export function usePreviousSetsForExercises(exerciseIds: string[], workoutTypeId?: string) {
  const db = useDatabase();
  return useQuery<Map<string, WorkoutSet[]>>({
    queryKey: ['previousSets', workoutTypeId ?? 'any', ...exerciseIds],
    queryFn: () => workoutService.getPreviousSetsForExercises(db, exerciseIds, workoutTypeId),
    enabled: exerciseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
