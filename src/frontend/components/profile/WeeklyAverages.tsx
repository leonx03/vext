/** WeeklyAverages - the current week's average body weight (with week-over-week delta) plus recent weeks. */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatWeight, formatWeekRange } from '@shared/utils/formatting';
import type { WeeklyAverageWeight } from '@shared/types/bodyWeight';
import type { UnitSystem } from '@shared/types/settings';

type WeeklyAveragesProps = {
  weeks: WeeklyAverageWeight[]; // most recent week first
  units: UnitSystem;
};

export function WeeklyAverages({ weeks, units }: WeeklyAveragesProps) {
  if (weeks.length === 0) return null;

  const [latest, ...rest] = weeks;
  const previous = rest[0];
  const deltaKg = previous ? latest.avgWeightKg - previous.avgWeightKg : null;
  // A change under 0.05 kg rounds to "0.0" at one decimal — treat it as flat.
  const isFlat = deltaKg != null && Math.abs(deltaKg) < 0.05;

  return (
    <View>
      <Text className="text-xs font-medium text-foreground-muted mb-2">Weekly average</Text>

      {/* Current (latest) week headline + week-over-week change */}
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-foreground-subtle">{formatWeekRange(latest.weekStart)}</Text>
          <Text className="text-2xl font-bold text-foreground">{formatWeight(latest.avgWeightKg, units)}</Text>
          <Text className="text-xs text-foreground-subtle">
            {latest.entryCount} {latest.entryCount === 1 ? 'entry' : 'entries'}
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
              {isFlat ? 'No change' : `${formatWeight(Math.abs(deltaKg), units)} vs last`}
            </Text>
          </View>
        )}
      </View>

      {/* Prior weeks, each with its own average */}
      {rest.length > 0 && (
        <View className="mt-3 gap-1.5">
          {rest.map((week) => (
            <View key={week.weekStart} className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">{formatWeekRange(week.weekStart)}</Text>
              <Text className="text-sm font-semibold text-foreground">
                {formatWeight(week.avgWeightKg, units)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
