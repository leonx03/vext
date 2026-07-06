/** History screen - every completed workout in reverse-chronological order, with per-session gym assignment. */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWorkoutHistoryByDate } from '@frontend/hooks/useHistory';
import { useSetWorkoutGym } from '@frontend/hooks/useWorkout';
import { useGyms, useAllGyms } from '@frontend/hooks/useGyms';
import { SelectPicker } from '@frontend/components/overlay/SelectPicker';
import { EmptyState } from '@frontend/components/EmptyState';
import { formatDate, formatDuration, parseUTCTimestamp } from '@shared/utils/formatting';
import { cn } from '@frontend/lib/utils';
import type { WorkoutSummary } from '@shared/types/workout';

export default function HistoryScreen() {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useWorkoutHistoryByDate();
  const setWorkoutGym = useSetWorkoutGym();
  const { data: activeGyms } = useGyms();
  const { data: allGyms } = useAllGyms();

  const [gymPickerFor, setGymPickerFor] = useState<WorkoutSummary | null>(null);

  // Resolve gym names including archived ones, so old sessions still show a label.
  const gymNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGyms ?? []) map.set(g.id, g.name);
    return map;
  }, [allGyms]);

  const workouts = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);

  const gymOptions = useMemo(
    () => (activeGyms ?? []).map((g) => ({ label: g.name, value: g.id })),
    [activeGyms]
  );

  const sessionDuration = (w: WorkoutSummary): number =>
    w.elapsedSeconds > 0
      ? w.elapsedSeconds
      : w.completedAt
        ? Math.floor(
            (parseUTCTimestamp(w.completedAt).getTime() - parseUTCTimestamp(w.startedAt).getTime()) / 1000
          )
        : 0;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="rgb(163, 163, 163)" />
        </Pressable>
        <Text className="text-2xl font-bold text-foreground">History</Text>
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4"
        contentContainerClassName={cn(workouts.length === 0 ? 'flex-1' : 'pb-[100px]')}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="rgb(52, 211, 153)" />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="rgb(52, 211, 153)" />
            </View>
          ) : (
            <EmptyState
              icon="time-outline"
              title="No workouts yet"
              message="Completed workouts show up here, newest first"
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
        renderItem={({ item }) => {
          const gymName = item.gymId ? gymNames.get(item.gymId) ?? null : null;
          const isUpdating = setWorkoutGym.isPending && setWorkoutGym.variables?.workoutId === item.id;
          return (
            <View className="mb-2 rounded-xl bg-background-50 p-4">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-semibold text-foreground">
                    {formatDate(item.startedAt)}
                  </Text>
                  <Text className="text-base font-semibold text-foreground mt-0.5">
                    {item.name || item.workoutTypeName}
                  </Text>
                </View>
                <View className="rounded-md bg-primary/15 px-2 py-1">
                  <Text className="text-xs font-medium text-primary">{item.workoutTypeName}</Text>
                </View>
              </View>

              <View className="flex-row gap-4 mb-3">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="time-outline" size={13} color="rgb(163, 163, 163)" />
                  <Text className="text-xs text-foreground-muted">{formatDuration(sessionDuration(item))}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="barbell-outline" size={13} color="rgb(163, 163, 163)" />
                  <Text className="text-xs text-foreground-muted">{item.exerciseCount} exercises</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="layers-outline" size={13} color="rgb(163, 163, 163)" />
                  <Text className="text-xs text-foreground-muted">{item.setCount} sets</Text>
                </View>
              </View>

              {/* Gym assignment — tap to set or change */}
              <Pressable
                onPress={() => setGymPickerFor(item)}
                disabled={isUpdating || gymOptions.length === 0}
                className={cn(
                  'flex-row items-center gap-1.5 self-start rounded-lg px-3 py-2',
                  gymName ? 'bg-background-100' : 'border border-dashed border-background-100'
                )}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={gymName ? 'rgb(52, 211, 153)' : 'rgb(163, 163, 163)'}
                />
                <Text className={cn('text-xs font-medium', gymName ? 'text-primary' : 'text-foreground-muted')}>
                  {isUpdating ? 'Saving…' : gymName ?? 'Set gym'}
                </Text>
                {!isUpdating && (
                  <Ionicons name="chevron-down" size={12} color="rgb(115, 115, 115)" />
                )}
              </Pressable>
            </View>
          );
        }}
      />

      <SelectPicker
        visible={gymPickerFor !== null}
        title="Which gym?"
        options={gymOptions}
        selectedValue={gymPickerFor?.gymId ?? undefined}
        onSelect={(gymId) => {
          if (gymPickerFor) setWorkoutGym.mutate({ workoutId: gymPickerFor.id, gymId });
        }}
        onClose={() => setGymPickerFor(null)}
      />
    </View>
  );
}
