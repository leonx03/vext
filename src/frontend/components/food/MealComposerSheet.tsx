/** MealComposerSheet - full-screen modal to create/edit a saved meal (composed of foods or manual totals). */
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@frontend/lib/utils';
import { FoodPickerSheet } from '@frontend/components/food/FoodPickerSheet';
import { MACRO_COLORS } from '@shared/constants/macros';
import { formatCalories, formatGrams, formatAmount } from '@shared/utils/formatting';
import type { FoodItem, Macros, SavedMealInput, SavedMealKind, SavedMealWithTotals } from '@shared/types/food';

type ComposedItem = { food: FoodItem; quantity: number };

type MealComposerSheetProps = {
  visible: boolean;
  meal?: SavedMealWithTotals | null;
  foods: FoodItem[];
  onSave: (input: SavedMealInput) => void;
  onClose: () => void;
};

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function MealComposerSheet({ visible, meal, foods, onSave, onClose }: MealComposerSheetProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SavedMealKind>('composed');
  const [items, setItems] = useState<ComposedItem[]>([]);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEditing = !!meal;

  useEffect(() => {
    if (!visible) return;
    if (meal) {
      setName(meal.name);
      setKind(meal.kind);
      setItems(meal.items.filter((it) => it.food).map((it) => ({ food: it.food!, quantity: it.quantity })));
      setCalories(meal.kind === 'manual' ? String(meal.calories ?? '') : '');
      setProtein(meal.kind === 'manual' ? String(meal.proteinG ?? '') : '');
      setCarbs(meal.kind === 'manual' ? String(meal.carbsG ?? '') : '');
      setFat(meal.kind === 'manual' ? String(meal.fatG ?? '') : '');
    } else {
      setName('');
      setKind('composed');
      setItems([]);
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
    setError(null);
  }, [visible, meal]);

  const composedTotals: Macros = useMemo(
    () =>
      items.reduce<Macros>(
        (acc, it) => {
          const f = it.food.servingSize > 0 ? it.quantity / it.food.servingSize : 0;
          return {
            calories: acc.calories + it.food.calories * f,
            proteinG: acc.proteinG + it.food.proteinG * f,
            carbsG: acc.carbsG + it.food.carbsG * f,
            fatG: acc.fatG + it.food.fatG * f,
          };
        },
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
      ),
    [items]
  );

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a meal name');
      return;
    }
    if (kind === 'composed') {
      if (items.length === 0) {
        setError('Add at least one food');
        return;
      }
      onSave({
        name: trimmed,
        kind: 'composed',
        items: items.map((it) => ({ foodId: it.food.id, quantity: it.quantity })),
      });
    } else {
      const macros = [calories, protein, carbs, fat].map(parseNum);
      if (macros.some((m) => !Number.isFinite(m) || m < 0)) {
        setError('Enter valid macro values (0 or more)');
        return;
      }
      onSave({
        name: trimmed,
        kind: 'manual',
        totals: { calories: macros[0], proteinG: macros[1], carbsG: macros[2], fatG: macros[3] },
      });
    }
    onClose();
  };

  const manualInput = (label: string, value: string, setter: (v: string) => void, color: string) => (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5 mb-1.5">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-xs font-medium text-foreground-muted">{label}</Text>
      </View>
      <TextInput
        className="rounded-xl bg-background-50 px-3 py-3 text-base text-foreground"
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="rgb(115, 115, 115)"
        value={value}
        onChangeText={setter}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-14">
          <Pressable onPress={onClose} className="py-1">
            <Text className="text-base text-foreground-muted">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-bold text-foreground">{isEditing ? 'Edit Meal' : 'New Meal'}</Text>
          <Pressable onPress={handleSave} className="py-1">
            <Text className="text-base font-semibold text-primary">Save</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 pb-10">
          <Text className="text-sm font-medium text-foreground">Name *</Text>
          <TextInput
            className="mt-2 rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
            placeholder="e.g. Chicken & rice lunch"
            placeholderTextColor="rgb(115, 115, 115)"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
          />

          {/* Kind toggle */}
          <View className="mt-4 flex-row gap-2">
            {(['composed', 'manual'] as SavedMealKind[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                className={cn(
                  'flex-1 rounded-xl py-3 items-center',
                  kind === k ? 'bg-primary' : 'bg-background-50'
                )}
              >
                <Text className={cn('text-sm font-medium', kind === k ? 'text-background' : 'text-foreground-muted')}>
                  {k === 'composed' ? 'From foods' : 'Manual macros'}
                </Text>
              </Pressable>
            ))}
          </View>

          {kind === 'composed' ? (
            <>
              <View className="mt-5 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">Foods</Text>
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  className="flex-row items-center gap-1 rounded-lg bg-background-50 px-3 py-2"
                >
                  <Ionicons name="add" size={16} color="rgb(52, 211, 153)" />
                  <Text className="text-sm text-primary">Add food</Text>
                </Pressable>
              </View>

              {items.length === 0 ? (
                <Text className="mt-3 text-sm text-foreground-subtle text-center py-6">No foods added yet</Text>
              ) : (
                <View className="mt-3 gap-2">
                  {items.map((it, idx) => {
                    const f = it.food.servingSize > 0 ? it.quantity / it.food.servingSize : 0;
                    return (
                      <View
                        key={`${it.food.id}-${idx}`}
                        className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3"
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-base text-foreground">{it.food.name}</Text>
                          <Text className="text-xs text-foreground-subtle">
                            {formatAmount(it.quantity, it.food.servingUnit)} ·{' '}
                            {formatCalories(it.food.calories * f)} · P {formatGrams(it.food.proteinG * f)}
                          </Text>
                        </View>
                        <Pressable onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="p-1.5">
                          <Ionicons name="close-circle" size={20} color="rgb(163, 163, 163)" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Live totals */}
              <View className="mt-4 rounded-xl bg-background-50 p-4">
                <Text className="text-xs font-medium text-foreground-muted mb-1">Meal total</Text>
                <Text className="text-2xl font-bold text-foreground">{formatCalories(composedTotals.calories)}</Text>
                <View className="mt-2 flex-row gap-4">
                  <Text className="text-sm" style={{ color: MACRO_COLORS.protein }}>
                    P {formatGrams(composedTotals.proteinG)}
                  </Text>
                  <Text className="text-sm" style={{ color: MACRO_COLORS.carbs }}>
                    C {formatGrams(composedTotals.carbsG)}
                  </Text>
                  <Text className="text-sm" style={{ color: MACRO_COLORS.fat }}>
                    F {formatGrams(composedTotals.fatG)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text className="mt-5 text-sm font-medium text-foreground">Macros per serving *</Text>
              <View className="mt-2 flex-row gap-2">
                {manualInput('Calories', calories, setCalories, MACRO_COLORS.calories)}
                {manualInput('Protein', protein, setProtein, MACRO_COLORS.protein)}
              </View>
              <View className="mt-3 flex-row gap-2">
                {manualInput('Carbs', carbs, setCarbs, MACRO_COLORS.carbs)}
                {manualInput('Fat', fat, setFat, MACRO_COLORS.fat)}
              </View>
            </>
          )}

          {error && <Text className="mt-4 text-sm text-destructive">{error}</Text>}
        </ScrollView>
      </View>

      <FoodPickerSheet
        visible={pickerOpen}
        foods={foods}
        title="Add food to meal"
        onPick={(food, quantity) => setItems((prev) => [...prev, { food, quantity }])}
        onClose={() => setPickerOpen(false)}
      />
    </Modal>
  );
}
