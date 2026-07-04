/** Food hooks - React Query queries and mutations for foods, saved meals, and daily logging. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as foodService from '@backend/services/foodService';
import { useDatabase } from '@frontend/hooks/useDatabase';
import type { FoodItemInput, SavedMealInput } from '@shared/types/food';

// ---- Queries ----------------------------------------------------------------

export function useFoods(includeArchived = false) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['food', 'items', includeArchived],
    queryFn: () => foodService.getFoods(db, includeArchived),
  });
}

export function useSavedMeals() {
  const db = useDatabase();
  return useQuery({
    queryKey: ['food', 'meals'],
    queryFn: () => foodService.getSavedMeals(db),
  });
}

export function useSavedMeal(id: string | null) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['food', 'meal', id],
    queryFn: () => (id ? foodService.getSavedMeal(db, id) : null),
    enabled: id != null,
  });
}

export function useFoodDay(date: string) {
  const db = useDatabase();
  return useQuery({
    queryKey: ['food', 'day', date],
    queryFn: () => foodService.getDay(db, date),
  });
}

// ---- Mutations --------------------------------------------------------------

function useFoodMutation<TArgs>(fn: (db: ReturnType<typeof useDatabase>, args: TArgs) => Promise<unknown>) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(db, args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food'] }),
  });
}

export function useCreateFood() {
  return useFoodMutation((db, input: FoodItemInput) => foodService.createFood(db, input));
}

export function useUpdateFood() {
  return useFoodMutation((db, args: { id: string; input: FoodItemInput }) =>
    foodService.updateFood(db, args.id, args.input)
  );
}

export function useArchiveFood() {
  return useFoodMutation((db, id: string) => foodService.archiveFood(db, id));
}

export function useCreateSavedMeal() {
  return useFoodMutation((db, input: SavedMealInput) => foodService.createSavedMeal(db, input));
}

export function useUpdateSavedMeal() {
  return useFoodMutation((db, args: { id: string; input: SavedMealInput }) =>
    foodService.updateSavedMeal(db, args.id, args.input)
  );
}

export function useArchiveSavedMeal() {
  return useFoodMutation((db, id: string) => foodService.archiveSavedMeal(db, id));
}

export function useLogFood() {
  return useFoodMutation((db, args: { date: string; foodId: string; quantity: number }) =>
    foodService.logFood(db, args.date, args.foodId, args.quantity)
  );
}

export function useLogSavedMeal() {
  return useFoodMutation((db, args: { date: string; savedMealId: string; servings?: number }) =>
    foodService.logSavedMeal(db, args.date, args.savedMealId, args.servings ?? 1)
  );
}

export function useUpdateLogQuantity() {
  return useFoodMutation((db, args: { id: string; quantity: number }) =>
    foodService.updateLogQuantity(db, args.id, args.quantity)
  );
}

export function useDeleteLogEntry() {
  return useFoodMutation((db, id: string) => foodService.deleteLogEntry(db, id));
}
