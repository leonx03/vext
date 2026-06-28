/** Gym hooks - React Query queries and mutations for managing gyms (training locations). */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as gymService from '@backend/services/gymService';
import { useDatabase } from '@frontend/hooks/useDatabase';
import type { Gym } from '@shared/types/gym';

/** Active (non-archived) gyms, ordered by sort order. */
export function useGyms() {
  const db = useDatabase();
  return useQuery<Gym[]>({
    queryKey: ['gyms', 'active'],
    queryFn: () => gymService.listGyms(db, false),
    staleTime: 60 * 1000,
  });
}

/** All gyms including archived — for history labels and the manage-gyms screen. */
export function useAllGyms() {
  const db = useDatabase();
  return useQuery<Gym[]>({
    queryKey: ['gyms', 'all'],
    queryFn: () => gymService.listGyms(db, true),
    staleTime: 60 * 1000,
  });
}

function useInvalidateGyms() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['gyms'] });
}

export function useCreateGym() {
  const db = useDatabase();
  const invalidate = useInvalidateGyms();
  return useMutation({
    mutationFn: (name: string) => gymService.createGym(db, name),
    onSuccess: invalidate,
  });
}

export function useRenameGym() {
  const db = useDatabase();
  const invalidate = useInvalidateGyms();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => gymService.renameGym(db, id, name),
    onSuccess: invalidate,
  });
}

export function useArchiveGym() {
  const db = useDatabase();
  const invalidate = useInvalidateGyms();
  return useMutation({
    mutationFn: (id: string) => gymService.archiveGym(db, id),
    onSuccess: invalidate,
  });
}

export function useUnarchiveGym() {
  const db = useDatabase();
  const invalidate = useInvalidateGyms();
  return useMutation({
    mutationFn: (id: string) => gymService.unarchiveGym(db, id),
    onSuccess: invalidate,
  });
}
