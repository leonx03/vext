/** WeightSparkline - minimal SVG sparkline showing body weight trend over time. */
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import type { BodyWeightEntry } from '@shared/types/bodyWeight';
import type { UnitSystem } from '@shared/types/settings';

type WeightSparklineProps = {
  entries: BodyWeightEntry[];
  units: UnitSystem;
  width?: number;
  height?: number;
};

function convertWeight(kg: number, units: UnitSystem): number {
  return units === 'imperial' ? kg * 2.20462 : kg;
}

export function WeightSparkline({ entries, units, width = 300, height = 60 }: WeightSparklineProps) {
  if (entries.length < 2) {
    return (
      <View className="items-center py-4">
        <Text className="text-xs text-foreground-subtle">Log at least 2 entries to see a trend</Text>
      </View>
    );
  }

  // Sort by date ascending for the sparkline
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((e) => convertWeight(e.weightKg, units));

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((v - min) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const unitLabel = units === 'imperial' ? 'lb' : 'kg';
  const displayMin = Number(convertWeight(min, 'metric' as UnitSystem).toFixed(1));
  const displayMax = Number(convertWeight(max, 'metric' as UnitSystem).toFixed(1));
  const minDisplay = Number((units === 'imperial' ? min : displayMin).toFixed(1));
  const maxDisplay = Number((units === 'imperial' ? max : displayMax).toFixed(1));

  return (
    <View>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke="rgb(52, 211, 153)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View className="flex-row justify-between px-1 mt-1">
        <Text className="text-xs text-foreground-subtle">{minDisplay} {unitLabel}</Text>
        <Text className="text-xs text-foreground-subtle">{maxDisplay} {unitLabel}</Text>
      </View>
    </View>
  );
}
