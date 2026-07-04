/** Saved meals library screen - list, create, edit, and archive reusable meals. */
import React, { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useSavedMeals,
  useSavedMeal,
  useFoods,
  useCreateSavedMeal,
  useUpdateSavedMeal,
  useArchiveSavedMeal,
} from '@frontend/hooks/useFood';
import { MealComposerSheet } from '@frontend/components/food/MealComposerSheet';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { formatCalories, formatGrams } from '@shared/utils/formatting';
import { MACRO_COLORS } from '@shared/constants/macros';
import type { SavedMealInput, SavedMealWithTotals } from '@shared/types/food';

export default function MealsScreen() {
  const router = useRouter();
  const { data: meals } = useSavedMeals();
  const { data: foods } = useFoods();
  const createMeal = useCreateSavedMeal();
  const updateMeal = useUpdateSavedMeal();
  const archiveMeal = useArchiveSavedMeal();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SavedMealWithTotals | null>(null);

  const { data: editingMeal } = useSavedMeal(editingId);

  const handleSave = (input: SavedMealInput) => {
    if (editingId) updateMeal.mutate({ id: editingId, input });
    else createMeal.mutate(input);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 py-1">
          <Ionicons name="chevron-back" size={20} color="rgb(163, 163, 163)" />
          <Text className="text-base text-foreground-muted">Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Saved Meals</Text>
        <Pressable
          onPress={() => {
            setEditingId(null);
            setComposerOpen(true);
          }}
          className="py-1"
        >
          <Ionicons name="add" size={24} color="rgb(52, 211, 153)" />
        </Pressable>
      </View>

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-4 pb-10"
        ListEmptyComponent={
          <Text className="text-sm text-foreground-subtle text-center py-10">
            No saved meals yet. Tap + to build one for one-tap logging.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3 mb-2">
            <Pressable
              className="flex-1 pr-3"
              onPress={() => {
                setEditingId(item.id);
                setComposerOpen(true);
              }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-base text-foreground">{item.name}</Text>
                <View className="rounded bg-background-100 px-1.5 py-0.5">
                  <Text className="text-[10px] text-foreground-subtle">
                    {item.kind === 'composed' ? 'recipe' : 'manual'}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-foreground-subtle">
                {formatCalories(item.totals.calories)} ·{' '}
                <Text style={{ color: MACRO_COLORS.protein }}>P {formatGrams(item.totals.proteinG)}</Text> · C{' '}
                {formatGrams(item.totals.carbsG)} · F {formatGrams(item.totals.fatG)}
              </Text>
            </Pressable>
            <Pressable onPress={() => setArchiveTarget(item)} className="p-1.5">
              <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
            </Pressable>
          </View>
        )}
      />

      <MealComposerSheet
        visible={composerOpen}
        meal={editingId ? editingMeal ?? null : null}
        foods={foods ?? []}
        onSave={handleSave}
        onClose={() => setComposerOpen(false)}
      />

      <ConfirmDialog
        visible={!!archiveTarget}
        title="Remove meal"
        message={`Remove "${archiveTarget?.name}"? Past log entries that used it are kept.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (archiveTarget) archiveMeal.mutate(archiveTarget.id);
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </View>
  );
}
