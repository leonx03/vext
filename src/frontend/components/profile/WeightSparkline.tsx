/** WeightSparkline - minimal SVG sparkline showing body weight trend over time. */
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

/** Build a smooth SVG path through the points using a Catmull-Rom spline (converted to cubic Béziers). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
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

  const coords = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * chartWidth,
    y: padding + chartHeight - ((v - min) / range) * chartHeight,
  }));
  const pathData = smoothPath(coords);

  const unitLabel = units === 'imperial' ? 'lb' : 'kg';
  // Labels track chronology, not value: left = starting (oldest) weight, right = latest entry.
  const startDisplay = Number(values[0].toFixed(1));
  const latestDisplay = Number(values[values.length - 1].toFixed(1));

  return (
    <View>
      <Svg width={width} height={height}>
        <Path
          d={pathData}
          fill="none"
          stroke="rgb(52, 211, 153)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View className="flex-row justify-between px-1 mt-1">
        <Text className="text-xs text-foreground-subtle">{startDisplay} {unitLabel}</Text>
        <Text className="text-xs text-foreground-subtle">{latestDisplay} {unitLabel}</Text>
      </View>
    </View>
  );
}
