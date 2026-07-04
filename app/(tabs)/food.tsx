/** Food screen - daily macro log: totals, remaining vs targets, one-tap quick-add, and the day's entries. */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDatabase } from '@frontend/hooks/useDatabase';
import { useSettingsStore } from '@backend/store/settingsStore';
import {
  useFoodDay,
  useSavedMeals,
  useFoods,
  useLogFood,
  useLogSavedMeal,
  useUpdateLogQuantity,
  useDeleteLogEntry,
} from '@frontend/hooks/useFood';
import { MacroProgressBar } from '@frontend/components/food/MacroProgressBar';
import { MacroChips } from '@frontend/components/food/MacroChips';
import { FoodPickerSheet } from '@frontend/components/food/FoodPickerSheet';
import { TargetsSheet } from '@frontend/components/food/TargetsSheet';
import { EditQuantitySheet } from '@frontend/components/food/EditQuantitySheet';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { MACRO_COLORS, MACRO_OVER_COLOR } from '@shared/constants/macros';
import { formatCalories, formatGrams, formatPlainDate } from '@shared/utils/formatting';
import type { FoodLogEntry } from '@shared/types/food';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
function dayLabel(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return 'Today';
  if (dateStr === shiftDate(today, -1)) return 'Yesterday';
  if (dateStr === shiftDate(today, 1)) return 'Tomorrow';
  return formatPlainDate(dateStr);
}

export default function FoodScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { dailyCalorieTarget, dailyProteinTarget, updateMacroTargets } = useSettingsStore();

  const [date, setDate] = useState(todayStr());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FoodLogEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<FoodLogEntry | null>(null);

  const { data: day } = useFoodDay(date);
  const { data: meals } = useSavedMeals();
  const { data: foods } = useFoods();

  const logFood = useLogFood();
  const logMeal = useLogSavedMeal();
  const updateQuantity = useUpdateLogQuantity();
  const deleteLog = useDeleteLogEntry();

  const totals = day?.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, entryCount: 0 };
  const entries = day?.entries ?? [];

  const calRemaining = Math.round(dailyCalorieTarget - totals.calories);
  const proRemaining = Math.round(dailyProteinTarget - totals.proteinG);

  const isToday = date === todayStr();

  const summaryTiles = useMemo(
    () => [
      { key: 'cal', label: 'Calories left', remaining: calRemaining, unit: 'kcal', distinct: false },
      { key: 'pro', label: 'Protein left', remaining: proRemaining, unit: 'g', distinct: true },
    ],
    [calRemaining, proRemaining]
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="pb-[100px]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">Nutrition</Text>
          <Pressable onPress={() => setTargetsOpen(true)} className="rounded-lg bg-background-50 px-3 py-2 flex-row items-center gap-1">
            <Ionicons name="options-outline" size={16} color="rgb(52, 211, 153)" />
            <Text className="text-sm text-primary">Targets</Text>
          </Pressable>
        </View>

        {/* Date selector */}
        <View className="flex-row items-center justify-between px-4 mt-1">
          <Pressable onPress={() => setDate((d) => shiftDate(d, -1))} className="rounded-lg bg-background-50 p-2">
            <Ionicons name="chevron-back" size={18} color="rgb(163, 163, 163)" />
          </Pressable>
          <Text className="flex-1 text-center text-sm font-medium text-foreground">{dayLabel(date)}</Text>
          <Pressable
            onPress={() => setDate((d) => shiftDate(d, 1))}
            className="rounded-lg bg-background-50 p-2"
            disabled={isToday}
          >
            <Ionicons name="chevron-forward" size={18} color={isToday ? 'rgb(64, 64, 64)' : 'rgb(163, 163, 163)'} />
          </Pressable>
        </View>

        {/* Remaining tiles */}
        <View className="flex-row px-4 mt-3 gap-3">
          {summaryTiles.map((t) => {
            const over = t.remaining < 0;
            return (
              <View
                key={t.key}
                className={`flex-1 rounded-xl p-4 ${t.distinct ? 'bg-primary/10 border border-primary/40' : 'bg-background-50'}`}
              >
                <Text className="text-xs text-foreground-muted">{t.label}</Text>
                <Text
                  className="mt-1 text-3xl font-bold"
                  style={{ color: t.distinct ? MACRO_COLORS.protein : 'rgb(250,250,250)' }}
                >
                  {over ? `+${Math.abs(t.remaining)}` : t.remaining}
                </Text>
                <Text className="text-xs" style={{ color: over ? MACRO_OVER_COLOR : 'rgb(115,115,115)' }}>
                  {over ? `${t.unit} over` : `${t.unit} remaining`}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Progress bars */}
        <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4 gap-4">
          <MacroProgressBar
            label="Calories"
            value={totals.calories}
            target={dailyCalorieTarget}
            unit="kcal"
            color={MACRO_COLORS.calories}
          />
          <MacroProgressBar
            label="Protein"
            value={totals.proteinG}
            target={dailyProteinTarget}
            unit="g"
            color={MACRO_COLORS.protein}
          />
          <View className="border-t border-background-100 pt-3">
            <MacroChips totals={totals} />
          </View>
        </View>

        {/* Quick-add saved meals */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between px-4 mb-2">
            <Text className="text-sm font-medium text-foreground-muted">Quick add</Text>
            <Pressable onPress={() => router.push('/food/meals')}>
              <Text className="text-xs text-primary">Manage meals</Text>
            </Pressable>
          </View>
          {meals && meals.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 gap-2">
              {meals.map((meal) => (
                <Pressable
                  key={meal.id}
                  onPress={() => logMeal.mutate({ date, savedMealId: meal.id })}
                  className="w-40 rounded-xl bg-background-50 p-3 border border-background-100"
                >
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text className="mt-1 text-xs text-foreground-subtle">{formatCalories(meal.totals.calories)}</Text>
                  <Text className="text-xs" style={{ color: MACRO_COLORS.protein }}>
                    P {formatGrams(meal.totals.proteinG)}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-1">
                    <Ionicons name="add-circle" size={16} color="rgb(52, 211, 153)" />
                    <Text className="text-xs text-primary">Log 1 serving</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Pressable onPress={() => router.push('/food/meals')} className="mx-4 rounded-xl bg-background-50 p-4 items-center">
              <Text className="text-sm text-foreground-subtle">No saved meals yet — create one for one-tap logging</Text>
            </Pressable>
          )}
        </View>

        {/* Add food button */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mx-4 mt-4 rounded-xl bg-background-50 py-3 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
          <Text className="text-sm font-semibold text-primary">Add a food</Text>
        </Pressable>

        {/* Log entries */}
        <View className="mx-4 mt-4">
          <Text className="text-sm font-medium text-foreground-muted mb-2">
            {dayLabel(date)}'s log{entries.length > 0 ? ` (${entries.length})` : ''}
          </Text>
          {entries.length === 0 ? (
            <Text className="text-sm text-foreground-subtle text-center py-6">Nothing logged yet</Text>
          ) : (
            <View className="gap-2">
              {entries.map((entry) => (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3"
                >
                  <Pressable className="flex-1 pr-3" onPress={() => setEditEntry(entry)}>
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={entry.entryType === 'meal' ? 'restaurant-outline' : 'nutrition-outline'}
                        size={14}
                        color="rgb(115, 115, 115)"
                      />
                      <Text className="text-base text-foreground" numberOfLines={1}>
                        {entry.name}
                      </Text>
                    </View>
                    <Text className="mt-0.5 text-xs text-foreground-subtle">
                      {formatCalories(entry.calories)} · P {formatGrams(entry.proteinG)} · C{' '}
                      {formatGrams(entry.carbsG)} · F {formatGrams(entry.fatG)}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setDeleteEntry(entry)} className="p-1.5">
                    <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Manage foods link */}
        <Pressable
          onPress={() => router.push('/food/foods')}
          className="mx-4 mt-4 flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="list-outline" size={18} color="rgb(163, 163, 163)" />
            <Text className="text-sm text-foreground">Manage foods</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgb(163, 163, 163)" />
        </Pressable>

        {(logFood.error || logMeal.error) && (
          <Text className="mx-4 mt-3 text-xs text-destructive">
            {(logFood.error as Error)?.message ?? (logMeal.error as Error)?.message}
          </Text>
        )}
      </ScrollView>

      {/* Overlays */}
      <FoodPickerSheet
        visible={pickerOpen}
        foods={foods ?? []}
        title="Log a food"
        confirmLabel="Log"
        onPick={(food, quantity) => logFood.mutate({ date, foodId: food.id, quantity })}
        onClose={() => setPickerOpen(false)}
      />

      <TargetsSheet
        visible={targetsOpen}
        calorieTarget={dailyCalorieTarget}
        proteinTarget={dailyProteinTarget}
        onSave={(cals, pro) => updateMacroTargets(db, { dailyCalorieTarget: cals, dailyProteinTarget: pro })}
        onClose={() => setTargetsOpen(false)}
      />

      <EditQuantitySheet
        visible={!!editEntry}
        entry={editEntry}
        onSave={(quantity) => {
          if (editEntry) updateQuantity.mutate({ id: editEntry.id, quantity });
        }}
        onClose={() => setEditEntry(null)}
      />

      <ConfirmDialog
        visible={!!deleteEntry}
        title="Delete entry"
        message={`Remove "${deleteEntry?.name}" from ${dayLabel(date).toLowerCase()}'s log?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteEntry) deleteLog.mutate(deleteEntry.id);
          setDeleteEntry(null);
        }}
        onCancel={() => setDeleteEntry(null)}
      />
    </View>
  );
}
