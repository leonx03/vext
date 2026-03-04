/** WorkoutCard - summary card for a completed workout shown in history and dashboard. */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutSummary } from '@shared/types/workout';
import { formatDate, formatDuration, formatVolume, parseUTCTimestamp } from '@shared/utils/formatting';
import { useSettingsStore } from '@backend/store/settingsStore';
import { MUSCLE_GROUP_LABELS } from '@shared/constants/muscleGroups';
import type { MuscleGroup } from '@shared/types/exercise';

type WorkoutCardProps = {
  workout: WorkoutSummary;
  onPress: () => void;
  onRepeat?: () => void;
  onContinue?: () => void;
  onDelete?: () => void;
  sessionCount?: number;
};

export function WorkoutCard({ workout, onPress, onRepeat, onContinue, onDelete, sessionCount }: WorkoutCardProps) {
  const units = useSettingsStore((s) => s.units);
  const duration = workout.elapsedSeconds > 0
    ? workout.elapsedSeconds
    : workout.completedAt
      ? Math.floor((parseUTCTimestamp(workout.completedAt).getTime() - parseUTCTimestamp(workout.startedAt).getTime()) / 1000)
      : 0;

  return (
    <Pressable onPress={onPress} className="mb-3 rounded-xl bg-background-50 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {workout.name || workout.workoutTypeName}
          </Text>
          <Text className="mt-1 text-xs text-foreground-subtle">
            {sessionCount && sessionCount > 1
              ? `${sessionCount} sessions · Last: ${formatDate(workout.startedAt)}`
              : formatDate(workout.startedAt)}
          </Text>
        </View>
        <View className="rounded-md bg-primary/15 px-2 py-1">
          <Text className="text-xs font-medium text-primary">{workout.workoutTypeName}</Text>
        </View>
      </View>

      {Object.keys(workout.muscleGroupSets).length > 0 && (
        <View className="mt-3">
          <Text className="mb-1.5 text-xs text-foreground-subtle">Sets done</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {Object.entries(workout.muscleGroupSets)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([muscle, count]) => (
                <View key={muscle} className="flex-row items-center rounded-full bg-background-100 px-2 py-0.5">
                  <Text className="text-xs text-foreground-muted">
                    {MUSCLE_GROUP_LABELS[muscle as MuscleGroup] ?? muscle} x{count}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}

      <View className="mt-3 flex-row items-start">
        <View className="flex-1 gap-1.5">
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={14} color="rgb(163, 163, 163)" />
            <Text className="text-xs text-foreground-muted">{formatDuration(duration)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="barbell-outline" size={14} color="rgb(163, 163, 163)" />
            <Text className="text-xs text-foreground-muted">{workout.exerciseCount} exercises</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="layers-outline" size={14} color="rgb(163, 163, 163)" />
            <Text className="text-xs text-foreground-muted">{workout.setCount} sets</Text>
          </View>
          {workout.totalVolume > 0 && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="trending-up-outline" size={14} color="rgb(163, 163, 163)" />
              <Text className="text-xs text-foreground-muted">{formatVolume(workout.totalVolume, units)}</Text>
            </View>
          )}
        </View>
        {onContinue && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onContinue();
            }}
            className="ml-2 rounded-lg bg-background-100 px-2.5 py-1.5 flex-row items-center gap-1"
          >
            <Ionicons name="play-outline" size={14} color="rgb(52, 211, 153)" />
            <Text className="text-xs font-medium text-primary">Continue</Text>
          </Pressable>
        )}
        {onRepeat && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onRepeat();
            }}
            className="ml-2 rounded-lg bg-background-100 px-2.5 py-1.5 flex-row items-center gap-1"
          >
            <Ionicons name="repeat-outline" size={14} color="rgb(52, 211, 153)" />
            <Text className="text-xs font-medium text-primary">Repeat</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-1.5 rounded-lg bg-background-100 p-1.5"
          >
            <Ionicons name="trash-outline" size={14} color="rgb(239, 68, 68)" />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
