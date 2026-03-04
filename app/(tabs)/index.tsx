/** Home screen - dashboard with weekly stats and muscle group breakdown. */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as progressService from '@backend/services/progressService';
import { useDatabase } from '@frontend/hooks/useDatabase';
import { useSettingsStore } from '@backend/store/settingsStore';
import { MUSCLE_GROUP_LABELS } from '@shared/constants/muscleGroups';
import type { MuscleGroup } from '@shared/types/exercise';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getWeekBounds(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - daysToMonday + offset * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const start = monday.toISOString().slice(0, 10);
  const end = sunday.toISOString().slice(0, 10);

  let label: string;
  if (offset === 0) label = 'This week';
  else if (offset === -1) label = 'Last week';
  else {
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    label = `${fmt(monday)} – ${fmt(sunday)}`;
  }

  return { start, end, label };
}

export default function HomeScreen() {
  const db = useDatabase();
  const units = useSettingsStore((s) => s.units);
  const [weekOffset, setWeekOffset] = useState(0);

  const { start: weekStart, end: weekEnd, label: weekLabel } = useMemo(
    () => getWeekBounds(weekOffset),
    [weekOffset]
  );

  const { data: weeklyStats } = useQuery({
    queryKey: ['weeklyStats', weekOffset],
    queryFn: () => progressService.getWeeklyStats(db, weekStart, weekEnd),
    staleTime: 60 * 1000,
  });

  const { data: weeklyMuscleGroups } = useQuery({
    queryKey: ['weeklyMuscleGroups', weekOffset],
    queryFn: () => progressService.getWeeklySetsByMuscleGroup(db, weekStart, weekEnd),
    staleTime: 60 * 1000,
  });

  const { data: weeklyPRCount } = useQuery({
    queryKey: ['weeklyPRCount', weekOffset],
    queryFn: () => progressService.getWeeklyPRCount(db, weekStart, weekEnd),
    staleTime: 60 * 1000,
  });

  const volumeUnit = units === 'metric' ? 'kg' : 'lb';

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="pb-[100px]">
        {/* Greeting */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">{getGreeting()}</Text>
          <Text className="mt-1 text-sm text-foreground-muted">Let's crush it today</Text>
        </View>

        {/* Week selector */}
        <View className="flex-row items-center justify-between px-4 mt-2">
          <Pressable
            onPress={() => setWeekOffset((o) => o - 1)}
            className="rounded-lg bg-background-50 p-2"
          >
            <Ionicons name="chevron-back" size={18} color="rgb(163, 163, 163)" />
          </Pressable>
          <Text className="flex-1 text-center text-sm font-medium text-foreground">{weekLabel}</Text>
          <Pressable
            onPress={() => setWeekOffset((o) => Math.min(o + 1, 0))}
            className="rounded-lg bg-background-50 p-2"
            disabled={weekOffset >= 0}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={weekOffset >= 0 ? 'rgb(64, 64, 64)' : 'rgb(163, 163, 163)'}
            />
          </Pressable>
        </View>

        {/* Stats row */}
        <View className="flex-row px-4 mt-3 gap-3">
          {/* PRs */}
          <View className="flex-1 rounded-xl bg-background-50 p-4 items-center">
            <Ionicons name="trophy-outline" size={24} color="rgb(251, 146, 60)" />
            <Text className="mt-1 text-2xl font-bold text-foreground">{weeklyPRCount ?? 0}</Text>
            <Text className="text-xs text-foreground-muted">PRs set</Text>
          </View>

          {/* Workouts */}
          <View className="flex-1 rounded-xl bg-background-50 p-4 items-center">
            <Ionicons name="barbell-outline" size={24} color="rgb(52, 211, 153)" />
            <Text className="mt-1 text-2xl font-bold text-foreground">{weeklyStats?.workoutsThisWeek ?? 0}</Text>
            <Text className="text-xs text-foreground-muted">Workouts</Text>
          </View>

          {/* Volume */}
          <View className="flex-1 rounded-xl bg-background-50 p-4 items-center">
            <Ionicons name="trending-up" size={24} color="rgb(52, 211, 153)" />
            <Text className="mt-1 text-lg font-bold text-foreground">
              {weeklyStats?.volumeThisWeek ? Math.round(weeklyStats.volumeThisWeek).toLocaleString() : '0'}
            </Text>
            <Text className="text-xs text-foreground-muted">{volumeUnit}</Text>
          </View>
        </View>

        {/* Muscle groups */}
        {weeklyMuscleGroups && Object.keys(weeklyMuscleGroups).length > 0 && (
          <View className="mx-4 mt-4 rounded-xl bg-background-50 p-4">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-sm font-medium text-foreground-muted">Sets by Muscle Group</Text>
              <Text className="text-sm font-semibold text-foreground">{weeklyStats?.setsThisWeek ?? 0} total</Text>
            </View>
            <View className="gap-2">
              {Object.entries(weeklyMuscleGroups).map(([muscle, count]) => (
                <View key={muscle} className="flex-row items-center justify-between">
                  <Text className="text-sm text-foreground">
                    {MUSCLE_GROUP_LABELS[muscle as MuscleGroup] ?? muscle}
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">{count} sets</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
