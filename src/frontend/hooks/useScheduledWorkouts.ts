/** Scheduled workout hooks - React Query queries and mutations for workout scheduling. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as scheduledWorkoutService from '@backend/services/scheduledWorkoutService';
import * as workoutSeriesModel from '@backend/models/workoutSeries';
import { useDatabase } from '@frontend/hooks/useDatabase';

export function useScheduledWorkoutsByMonth(year: number, month: number) {
  const db = useDatabase();
  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;
  return useQuery({
    queryKey: ['scheduledWorkouts', year, month],
    queryFn: () => scheduledWorkoutService.getScheduledByDateRange(db, startDate, endDate),
    staleTime: 60 * 1000,
  });
}

export function useAllWorkoutSeries() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['workoutSeries', 'withCompletedWorkouts'],
    queryFn: () => workoutSeriesModel.getAllWithCompletedWorkouts(db),
  });
}

export function useScheduleWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ seriesId, date, notes }: { seriesId: string; date: string; notes?: string | null }) =>
      scheduledWorkoutService.scheduleWorkout(db, seriesId, date, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] });
    },
  });
}

export function useRescheduleWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newDate }: { id: string; newDate: string }) =>
      scheduledWorkoutService.reschedule(db, id, newDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] });
    },
  });
}

export function useCancelScheduledWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduledWorkoutService.cancelScheduled(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] });
    },
  });
}

export function useTodayScheduledWorkouts() {
  const db = useDatabase();
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return useQuery({
    queryKey: ['scheduledWorkouts', 'today', today],
    queryFn: () => scheduledWorkoutService.getScheduledByDate(db, today),
    staleTime: 60 * 1000,
  });
}

export function useStartScheduledWorkout() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduledId, seriesId }: { scheduledId: string; seriesId: string }) =>
      scheduledWorkoutService.startScheduledWorkout(db, scheduledId, seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledWorkouts'] });
      queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
    },
  });
}
