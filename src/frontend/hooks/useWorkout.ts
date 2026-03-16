/** Workout hooks - React Query mutations and queries for the active workout lifecycle. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as workoutService from '@backend/services/workoutService';
import { useDatabase } from '@frontend/hooks/useDatabase';
import type { WorkoutSetInput } from '@backend/models/workoutSet';
import type { WorkoutFull } from '@shared/types/workout';
import type { ExerciseAlternative } from '@backend/models/exerciseAlternative';

export function useActiveWorkout() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['activeWorkout'],
    queryFn: () => workoutService.getActiveWorkout(db),
    staleTime: 30 * 1000,
  });
}

export function useFullWorkout(workoutId: string | undefined) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => workoutService.getFullWorkout(db, workoutId!),
    enabled: !!workoutId,
    staleTime: 30 * 1000,
  });
}

export function useStartWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, name }: { typeId: string; name?: string }) =>
      workoutService.startWorkout(db, typeId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
    },
  });
}

export function useAddExercise(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exerciseId, restSeconds }: { exerciseId: string; restSeconds?: number }) =>
      workoutService.addExerciseToWorkout(db, workoutId, exerciseId, restSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useLogSet(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutExerciseId, data }: { workoutExerciseId: string; data: WorkoutSetInput }) =>
      workoutService.logSet(db, workoutExerciseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useUpdateSet(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ setId, data }: { setId: string; data: WorkoutSetInput }) =>
      workoutService.updateSet(db, setId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useRemoveSet(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setId: string) => workoutService.removeSet(db, setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}


export function useReorderExercises(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      workoutService.reorderExercises(db, workoutId, orderedIds),
    onMutate: (orderedIds) => {
      const previous = queryClient.getQueryData<WorkoutFull>(['workout', workoutId]);
      queryClient.setQueryData<WorkoutFull>(['workout', workoutId], (old) => {
        if (!old) return old;
        const reordered = orderedIds
          .map((id) => old.exercises.find((e) => e.id === id))
          .filter((e): e is typeof old.exercises[number] => !!e);
        return { ...old, exercises: reordered };
      });
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['workout', workoutId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useRemoveExercise(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutExerciseId: string) =>
      workoutService.removeExerciseFromWorkout(db, workoutExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useCompleteWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutService.completeWorkout(db, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutGroupDetails'] });
      queryClient.invalidateQueries({ queryKey: ['previousSets'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyStats'] });
      queryClient.invalidateQueries({ queryKey: ['currentStreak'] });
      queryClient.invalidateQueries({ queryKey: ['workoutFrequency'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
      queryClient.invalidateQueries({ queryKey: ['volumeOverTime'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
    },
  });
}

export function useDiscardWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutService.discardWorkout(db, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
    },
  });
}

export function useRepeatWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceWorkoutId: string) =>
      workoutService.repeatWorkout(db, sourceWorkoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
    },
  });
}

export function useDeleteWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutService.deleteWorkout(db, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistoryCount'] });
      queryClient.invalidateQueries({ queryKey: ['workoutGroupDetails'] });
      queryClient.invalidateQueries({ queryKey: ['previousSets'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyStats'] });
      queryClient.invalidateQueries({ queryKey: ['currentStreak'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
    },
  });
}

export function useDeleteWorkouts() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutIds: string[]) => workoutService.deleteWorkouts(db, workoutIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistoryCount'] });
      queryClient.invalidateQueries({ queryKey: ['workoutGroupDetails'] });
      queryClient.invalidateQueries({ queryKey: ['previousSets'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyStats'] });
      queryClient.invalidateQueries({ queryKey: ['currentStreak'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
    },
  });
}

export function useContinueWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutService.continueWorkout(db, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistoryCount'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyStats'] });
      queryClient.invalidateQueries({ queryKey: ['currentStreak'] });
    },
  });
}

export function useForceContinueWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => workoutService.forceContinueWorkout(db, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistoryCount'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyStats'] });
      queryClient.invalidateQueries({ queryKey: ['currentStreak'] });
    },
  });
}

export function useUpdateWorkoutExerciseRestSeconds(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutExerciseId, restSeconds }: { workoutExerciseId: string; restSeconds: number }) =>
      workoutService.updateWorkoutExerciseRestSeconds(db, workoutExerciseId, restSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useMakeSuperset(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutExerciseId, newExerciseId }: { workoutExerciseId: string; newExerciseId: string }) =>
      workoutService.makeSuperset(db, workoutId, workoutExerciseId, newExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useAddExerciseToSuperset(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, newExerciseId }: { groupId: string; newExerciseId: string }) =>
      workoutService.addExerciseToSuperset(db, workoutId, groupId, newExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useDisbandSuperset(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => workoutService.disbandSuperset(db, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useUpdateSupersetRestSeconds(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, restSeconds }: { groupId: string; restSeconds: number }) =>
      workoutService.updateSupersetRestSeconds(db, groupId, restSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useLogSupersetRound(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => workoutService.logSupersetRound(db, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useUpdateExerciseTargetReps(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutExerciseId, targetRepsMin, targetRepsMax }: { workoutExerciseId: string; targetRepsMin: number | null; targetRepsMax: number | null }) =>
      workoutService.updateExerciseTargetReps(db, workoutExerciseId, targetRepsMin, targetRepsMax),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
    },
  });
}

export function useUpdateWorkoutName() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, name }: { workoutId: string; name: string }) =>
      workoutService.updateWorkoutSeriesName(db, workoutId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      queryClient.invalidateQueries({ queryKey: ['workoutGroupDetails'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
    },
  });
}

export function useMoveSeriesUp() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seriesId: string) => workoutService.moveSeriesUp(db, seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
    },
  });
}

export function useMoveSeriesDown() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seriesId: string) => workoutService.moveSeriesDown(db, seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
    },
  });
}

export function useExerciseAlternatives(slotId: string | null | undefined) {
  const db = useDatabase();
  return useQuery<ExerciseAlternative[]>({
    queryKey: ['exerciseAlternatives', slotId ?? 'none'],
    queryFn: () => workoutService.getExerciseAlternatives(db, slotId!),
    enabled: !!slotId,
    staleTime: 60 * 1000,
  });
}

export function useAddExerciseAlternative(slotId: string | null | undefined) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alternativeExerciseId: string) =>
      workoutService.addExerciseAlternative(db, slotId!, alternativeExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseAlternatives', slotId ?? 'none'] });
    },
  });
}

export function useRemoveExerciseAlternative(slotId: string | null | undefined) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alternativeId: string) => workoutService.removeExerciseAlternative(db, alternativeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseAlternatives', slotId ?? 'none'] });
    },
  });
}

export function useSwitchWorkoutExercise(workoutId: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutExerciseId, newExerciseId }: { workoutExerciseId: string; newExerciseId: string }) =>
      workoutService.switchWorkoutExercise(db, workoutExerciseId, newExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['previousSets'] });
    },
  });
}
