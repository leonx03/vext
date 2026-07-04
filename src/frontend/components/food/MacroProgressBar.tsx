/** MacroProgressBar - a labeled progress bar showing consumed vs target with remaining/over text. */
import React from 'react';
import { View, Text } from 'react-native';
import { MACRO_OVER_COLOR } from '@shared/constants/macros';

type MacroProgressBarProps = {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
};

export function MacroProgressBar({ label, value, target, unit, color }: MacroProgressBarProps) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target;
  const remaining = Math.max(0, target - value);

  return (
    <View>
      <View className="flex-row items-baseline justify-between mb-1.5">
        <Text className="text-xs font-medium text-foreground-muted">{label}</Text>
        <Text className="text-xs text-foreground-subtle">
          {Math.round(value)} / {Math.round(target)} {unit}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-background-100 overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: over ? MACRO_OVER_COLOR : color }}
        />
      </View>
      <Text className="mt-1 text-xs" style={{ color: over ? MACRO_OVER_COLOR : color }}>
        {over
          ? `${Math.round(value - target)} ${unit} over`
          : `${Math.round(remaining)} ${unit} left`}
      </Text>
    </View>
  );
}
