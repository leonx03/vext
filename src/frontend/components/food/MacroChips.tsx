/** MacroChips - compact row showing consumed calories + protein/carbs/fat totals with color dots. */
import React from 'react';
import { View, Text } from 'react-native';
import { MACRO_COLORS } from '@shared/constants/macros';
import { formatCalories, formatGrams } from '@shared/utils/formatting';
import type { Macros } from '@shared/types/food';

function Chip({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <View className="flex-1 items-center">
      <View className="flex-row items-center gap-1">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-xs text-foreground-subtle">{label}</Text>
      </View>
      <Text className="mt-1 text-sm font-semibold text-foreground">{text}</Text>
    </View>
  );
}

export function MacroChips({ totals }: { totals: Macros }) {
  return (
    <View className="flex-row">
      <Chip label="Calories" text={formatCalories(totals.calories)} color={MACRO_COLORS.calories} />
      <Chip label="Protein" text={formatGrams(totals.proteinG)} color={MACRO_COLORS.protein} />
      <Chip label="Carbs" text={formatGrams(totals.carbsG)} color={MACRO_COLORS.carbs} />
      <Chip label="Fat" text={formatGrams(totals.fatG)} color={MACRO_COLORS.fat} />
    </View>
  );
}
