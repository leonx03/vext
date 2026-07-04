/** FoodPickerSheet - full-screen modal to pick a food + quantity. Reused for logging and meal composing. */
import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MACRO_COLORS } from '@shared/constants/macros';
import { formatCalories, formatGrams, formatAmount } from '@shared/utils/formatting';
import type { FoodItem } from '@shared/types/food';

type FoodPickerSheetProps = {
  visible: boolean;
  foods: FoodItem[];
  title?: string;
  confirmLabel?: string;
  onPick: (food: FoodItem, quantity: number) => void;
  onClose: () => void;
};

export function FoodPickerSheet({
  visible,
  foods,
  title = 'Add food',
  confirmLabel = 'Add',
  onPick,
  onClose,
}: FoodPickerSheetProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelected(null);
      setQty('');
      setError(null);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
  }, [foods, query]);

  const pickFood = (food: FoodItem) => {
    setSelected(food);
    setQty(String(food.servingSize));
    setError(null);
  };

  const quantityNum = parseFloat(qty);
  const factor = selected && selected.servingSize > 0 && Number.isFinite(quantityNum)
    ? quantityNum / selected.servingSize
    : 0;

  const handleConfirm = () => {
    if (!selected) return;
    if (!(quantityNum > 0)) {
      setError('Enter a valid amount');
      return;
    }
    onPick(selected, quantityNum);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-14">
          <Pressable onPress={selected ? () => setSelected(null) : onClose} className="py-1 flex-row items-center gap-1">
            {selected ? (
              <>
                <Ionicons name="chevron-back" size={18} color="rgb(163, 163, 163)" />
                <Text className="text-base text-foreground-muted">Back</Text>
              </>
            ) : (
              <Text className="text-base text-foreground-muted">Cancel</Text>
            )}
          </Pressable>
          <Text className="text-lg font-bold text-foreground">{selected ? selected.name : title}</Text>
          {selected ? (
            <Pressable onPress={handleConfirm} className="py-1">
              <Text className="text-base font-semibold text-primary">{confirmLabel}</Text>
            </Pressable>
          ) : (
            <View className="w-16" />
          )}
        </View>

        {selected ? (
          /* Quantity step */
          <View className="px-4 py-5">
            <Text className="text-sm font-medium text-foreground mb-2">
              Amount ({selected.servingUnit})
            </Text>
            <TextInput
              className="rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
              keyboardType="decimal-pad"
              value={qty}
              onChangeText={(t) => {
                setQty(t);
                setError(null);
              }}
              autoFocus
            />
            <Text className="mt-2 text-xs text-foreground-subtle">
              Macros are per {formatAmount(selected.servingSize, selected.servingUnit)}.
            </Text>

            {/* Live preview */}
            <View className="mt-5 rounded-xl bg-background-50 p-4">
              <Text className="text-xs font-medium text-foreground-muted mb-2">This adds</Text>
              <Text className="text-2xl font-bold text-foreground">
                {formatCalories(selected.calories * factor)}
              </Text>
              <View className="mt-2 flex-row gap-4">
                <Text className="text-sm" style={{ color: MACRO_COLORS.protein }}>
                  P {formatGrams(selected.proteinG * factor)}
                </Text>
                <Text className="text-sm" style={{ color: MACRO_COLORS.carbs }}>
                  C {formatGrams(selected.carbsG * factor)}
                </Text>
                <Text className="text-sm" style={{ color: MACRO_COLORS.fat }}>
                  F {formatGrams(selected.fatG * factor)}
                </Text>
              </View>
            </View>
            {error && <Text className="mt-3 text-sm text-destructive">{error}</Text>}
          </View>
        ) : (
          /* Food list */
          <>
            <View className="px-4 py-3">
              <TextInput
                className="rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
                placeholder="Search foods"
                placeholderTextColor="rgb(115, 115, 115)"
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerClassName="px-4 pb-10"
              ListEmptyComponent={
                <Text className="text-sm text-foreground-subtle text-center py-8">
                  {foods.length === 0 ? 'No foods yet. Add foods from Manage foods.' : 'No matches'}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => pickFood(item)}
                  className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3 mb-2"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-base text-foreground">{item.name}</Text>
                    <Text className="text-xs text-foreground-subtle">
                      {formatCalories(item.calories)} · P {formatGrams(item.proteinG)} · per{' '}
                      {formatAmount(item.servingSize, item.servingUnit)}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color="rgb(52, 211, 153)" />
                </Pressable>
              )}
            />
          </>
        )}
      </View>
    </Modal>
  );
}
