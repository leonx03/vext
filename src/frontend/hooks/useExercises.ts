/** Exercise hooks - React Query mutations for creating, updating, and archiving exercises. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import * as exerciseModel from '@backend/models/exercise';
import * as exerciseService from '@backend/services/exerciseService';
import { useDatabase } from '@frontend/hooks/useDatabase';
import type { ExerciseCategory, Equipment, MuscleGroup } from '@shared/types/exercise';
import { APP_CONFIG } from '@config/app';

export function useExercises(category?: ExerciseCategory) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['exercises', category ?? 'all'],
    queryFn: () => category ? exerciseModel.getByCategory(db, category) : exerciseModel.getAll(db),
    staleTime: 5 * 60 * 1000, // exercises are static
  });
}

export function useExerciseSearch(query: string) {
  const db = useDatabase();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), APP_CONFIG.defaults.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['exercises', 'search', debouncedQuery],
    queryFn: () => exerciseModel.search(db, debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExercise(id: string) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseModel.getById(db, id),
    enabled: !!id,
  });
}

export function useCreateExercise() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      category: ExerciseCategory;
      primaryMuscles: MuscleGroup[];
      equipment: Equipment;
      instructions?: string | null;
      restSeconds?: number | null;
    }) => exerciseService.createExercise(db, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

export function useUpdateExercise() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        name?: string;
        category?: ExerciseCategory;
        primaryMuscles?: MuscleGroup[];
        equipment?: Equipment;
        instructions?: string | null;
        restSeconds?: number | null;
      };
    }) => exerciseService.updateExercise(db, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      queryClient.refetchQueries({ queryKey: ['workoutHistory'] });
      queryClient.refetchQueries({ queryKey: ['workoutGroupDetails'] });
      queryClient.invalidateQueries({ queryKey: ['recentWorkouts'] });
    },
  });
}

export function useArchiveExercise() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exerciseService.archiveExercise(db, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}
