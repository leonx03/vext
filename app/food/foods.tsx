/** Foods library screen - list, create, edit, and archive foods. */
import React, { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFoods, useCreateFood, useUpdateFood, useArchiveFood } from '@frontend/hooks/useFood';
import { FoodFormSheet } from '@frontend/components/food/FoodFormSheet';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { formatCalories, formatGrams, formatAmount } from '@shared/utils/formatting';
import { MACRO_COLORS } from '@shared/constants/macros';
import type { FoodItem, FoodItemInput } from '@shared/types/food';

export default function FoodsScreen() {
  const router = useRouter();
  const { data: foods } = useFoods();
  const createFood = useCreateFood();
  const updateFood = useUpdateFood();
  const archiveFood = useArchiveFood();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<FoodItem | null>(null);

  const handleSave = (input: FoodItemInput) => {
    if (editing) updateFood.mutate({ id: editing.id, input });
    else createFood.mutate(input);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 py-1">
          <Ionicons name="chevron-back" size={20} color="rgb(163, 163, 163)" />
          <Text className="text-base text-foreground-muted">Back</Text>
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Foods</Text>
        <Pressable
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="py-1"
        >
          <Ionicons name="add" size={24} color="rgb(52, 211, 153)" />
        </Pressable>
      </View>

      <FlatList
        data={foods}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-4 pb-10"
        ListEmptyComponent={
          <Text className="text-sm text-foreground-subtle text-center py-10">
            No foods yet. Tap + to add one.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3 mb-2">
            <Pressable
              className="flex-1 pr-3"
              onPress={() => {
                setEditing(item);
                setFormOpen(true);
              }}
            >
              <Text className="text-base text-foreground">{item.name}</Text>
              <Text className="text-xs text-foreground-subtle">
                per {formatAmount(item.servingSize, item.servingUnit)} · {formatCalories(item.calories)} ·{' '}
                <Text style={{ color: MACRO_COLORS.protein }}>P {formatGrams(item.proteinG)}</Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => setArchiveTarget(item)} className="p-1.5">
              <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
            </Pressable>
          </View>
        )}
      />

      <FoodFormSheet
        visible={formOpen}
        food={editing}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        visible={!!archiveTarget}
        title="Remove food"
        message={`Remove "${archiveTarget?.name}"? Past log entries and meals that use it are kept.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (archiveTarget) archiveFood.mutate(archiveTarget.id);
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </View>
  );
}
