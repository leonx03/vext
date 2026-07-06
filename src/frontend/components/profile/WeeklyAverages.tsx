/** WeeklyAverages - the average body weight for a single week (selected or most recent) with a week-over-week delta. */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatWeight, formatWeekRange } from '@shared/utils/formatting';
import type { WeeklyAverageWeight } from '@shared/types/bodyWeight';
import type { UnitSystem } from '@shared/types/settings';

type WeeklyAveragesProps = {
  weeks: WeeklyAverageWeight[]; // most recent week first
  units: UnitSystem;
  /**
   * Monday-anchored week to display (matches `weekStart`). When omitted, the most recent week
   * with entries is shown. When set but that week has no entries, an empty state is shown.
   */
  selectedWeekStart?: string;
};

export function WeeklyAverages({ weeks, units, selectedWeekStart }: WeeklyAveragesProps) {
  const idx = selectedWeekStart
    ? weeks.findIndex((w) => w.weekStart === selectedWeekStart)
    : weeks.length > 0
      ? 0
      : -1;
  const current = idx >= 0 ? weeks[idx] : null;
  // The next entry in the (descending) list is the most recent week before `current` with entries.
  const previous = idx >= 0 ? weeks[idx + 1] : undefined;

  const deltaKg = current && previous ? current.avgWeightKg - previous.avgWeightKg : null;
  // A change under 0.05 kg rounds to "0.0" at one decimal — treat it as flat.
  const isFlat = deltaKg != null && Math.abs(deltaKg) < 0.05;

  return (
    <View>
      <Text className="text-xs font-medium text-foreground-muted mb-2">Weekly average</Text>

      {current ? (
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-xs text-foreground-subtle">{formatWeekRange(current.weekStart)}</Text>
            <Text className="text-2xl font-bold text-foreground">{formatWeight(current.avgWeightKg, units)}</Text>
            <Text className="text-xs text-foreground-subtle">
              {current.entryCount} {current.entryCount === 1 ? 'entry' : 'entries'}
            </Text>
          </View>

          {deltaKg != null && (
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={isFlat ? 'remove' : deltaKg > 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color="rgb(163, 163, 163)"
              />
              <Text className="text-sm text-foreground-muted">
                {isFlat ? 'No change' : `${formatWeight(Math.abs(deltaKg), units)} vs prior week`}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text className="text-sm text-foreground-muted">No entries this week</Text>
      )}
    </View>
  );
}
