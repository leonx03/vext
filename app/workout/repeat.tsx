/** Repeat workout screen - pick a workout group to repeat its latest session. */
import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@frontend/components/EmptyState';
import { useWorkoutHistory } from '@frontend/hooks/useHistory';
import { useRepeatWorkout } from '@frontend/hooks/useWorkout';
import { cn } from '@frontend/lib/utils';
import type { WorkoutSummary } from '@shared/types/workout';

interface WorkoutGroupItem {
  key: string;
  displayName: string;
  workoutTypeName: string;
  sessionCount: number;
  latestId: string;
}

function getBaseName(name: string | null, typeName: string): string {
  if (!name) return typeName;
  return name.replace(/\s*\(#\d+\)$/, '');
}

function groupWorkouts(workouts: WorkoutSummary[]): WorkoutGroupItem[] {
  const map = new Map<string, WorkoutGroupItem>();
  for (const w of workouts) {
    const baseName = getBaseName(w.name, w.workoutTypeName);
    const key = `${w.workoutTypeName}::${baseName}`;
    const existing = map.get(key);
    if (existing) {
      existing.sessionCount++;
    } else {
      map.set(key, {
        key,
        displayName: baseName,
        workoutTypeName: w.workoutTypeName,
        sessionCount: 1,
        latestId: w.id,
      });
    }
  }
  return Array.from(map.values());
}

export default function RepeatWorkoutScreen() {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkoutHistory();
  const repeatWorkout = useRepeatWorkout();

  const workouts = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);
  const groups = useMemo(() => groupWorkouts(workouts), [workouts]);

  const handleRepeat = async (workoutId: string) => {
    try {
      const newWorkout = await repeatWorkout.mutateAsync(workoutId);
      router.replace(`/workout/${newWorkout.id}`);
    } catch (e) {
      if (__DEV__) console.warn('Repeat workout failed:', e);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="rgb(250, 250, 250)" />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Repeat Past Workout</Text>
      </View>

      <Text className="px-4 mb-3 text-sm text-foreground-muted">
        Choose a workout to repeat its exercises
      </Text>

      {repeatWorkout.error && (
        <Text className="px-4 mb-2 text-xs text-destructive">
          {(repeatWorkout.error as Error)?.message || 'An error occurred'}
        </Text>
      )}

      {repeatWorkout.isPending && (
        <View className="absolute inset-0 z-10 items-center justify-center bg-background/80">
          <ActivityIndicator size="large" color="rgb(52, 211, 153)" />
          <Text className="mt-3 text-sm text-foreground-muted">Creating workout...</Text>
        </View>
      )}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.key}
        className="flex-1 px-4"
        contentContainerClassName={cn(groups.length === 0 ? 'flex-1' : 'pb-[100px]')}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="rgb(52, 211, 153)" />
            </View>
          ) : (
            <EmptyState
              icon="fitness-outline"
              title="No completed workouts"
              message="Complete a workout first to repeat it later"
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="rgb(52, 211, 153)" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleRepeat(item.latestId)}
            className="mb-3 rounded-xl bg-background-50 p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{item.displayName}</Text>
                <Text className="text-xs text-foreground-muted mt-0.5">
                  {item.workoutTypeName} · {item.sessionCount} session{item.sessionCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View className="rounded-lg bg-primary/15 px-3 py-1.5">
                <Text className="text-xs font-semibold text-primary">Repeat</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
