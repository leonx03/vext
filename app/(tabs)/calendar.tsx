/** Agenda screen - monthly view of completed and scheduled workouts with day drill-down and scheduling. */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWorkoutsByMonth } from '@frontend/hooks/useHistory';
import {
  useScheduledWorkoutsByMonth,
  useAllWorkoutSeries,
  useScheduleWorkout,
  useCancelScheduledWorkout,
  useStartScheduledWorkout,
} from '@frontend/hooks/useScheduledWorkouts';
import { parseUTCTimestamp, formatDuration } from '@shared/utils/formatting';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import type { WorkoutSummary } from '@shared/types/workout';
import type { ScheduledWorkout } from '@shared/types/scheduledWorkout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AgendaScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ScheduledWorkout | null>(null);

  const { data: workouts, isLoading: workoutsLoading } = useWorkoutsByMonth(year, month);
  const { data: scheduled, isLoading: scheduledLoading } = useScheduledWorkoutsByMonth(year, month);
  const { data: allSeries } = useAllWorkoutSeries();
  const scheduleWorkout = useScheduleWorkout();
  const cancelScheduled = useCancelScheduledWorkout();
  const startScheduled = useStartScheduledWorkout();

  const isLoading = workoutsLoading || scheduledLoading;

  // Build maps: 'YYYY-MM-DD' -> items
  const workoutsByDay = React.useMemo(() => {
    const map = new Map<string, WorkoutSummary[]>();
    for (const w of workouts ?? []) {
      const d = parseUTCTimestamp(w.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return map;
  }, [workouts]);

  const scheduledByDay = React.useMemo(() => {
    const map = new Map<string, ScheduledWorkout[]>();
    for (const s of scheduled ?? []) {
      if (s.workoutStatus === 'completed') continue;
      if (!map.has(s.scheduledDate)) map.set(s.scheduledDate, []);
      map.get(s.scheduledDate)!.push(s);
    }
    return map;
  }, [scheduled]);

  const selectedWorkouts = selectedDate ? (workoutsByDay.get(selectedDate) ?? []) : [];
  const selectedScheduled = selectedDate ? (scheduledByDay.get(selectedDate) ?? []) : [];

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const todayKey = getTodayKey();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const handleStartScheduled = async (s: ScheduledWorkout) => {
    try {
      const workout = await startScheduled.mutateAsync({ scheduledId: s.id, seriesId: s.seriesId });
      router.replace(`/workout/${workout.id}`);
    } catch (e) {
      if (__DEV__) console.warn('Start scheduled workout failed:', e);
    }
  };

  const handleSchedule = (seriesId: string) => {
    if (!selectedDate) return;
    scheduleWorkout.mutate({ seriesId, date: selectedDate });
    setShowSeriesPicker(false);
  };

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-foreground">Agenda</Text>
      </View>

      {/* Month navigation */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={prevMonth} className="p-2 rounded-lg bg-background-50">
          <Ionicons name="chevron-back" size={20} color="rgb(163, 163, 163)" />
        </Pressable>
        <Text className="text-base font-semibold text-foreground">
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <Pressable onPress={nextMonth} className="p-2 rounded-lg bg-background-50">
          <Ionicons name="chevron-forward" size={20} color="rgb(163, 163, 163)" />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View className="flex-row px-4 mb-1">
        {WEEKDAYS.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text className="text-xs font-medium text-foreground-subtle">{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="rgb(52, 211, 153)" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-[100px]">
          <View className="px-4">
            {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
              <View key={rowIdx} className="flex-row mb-1">
                {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                  if (day === null) {
                    return <View key={colIdx} className="flex-1 aspect-square" />;
                  }
                  const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                  const hasWorkout = workoutsByDay.has(dateKey);
                  const hasScheduled = scheduledByDay.has(dateKey);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDate;

                  return (
                    <Pressable
                      key={colIdx}
                      onPress={() => setSelectedDate(isSelected ? null : dateKey)}
                      className="flex-1 aspect-square items-center justify-center mx-0.5 rounded-lg"
                      style={isSelected ? { backgroundColor: 'rgb(52, 211, 153)' } : isToday ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : undefined}
                    >
                      <Text className={`text-sm font-medium ${isSelected ? 'text-background' : isToday ? 'text-primary' : 'text-foreground'}`}>
                        {day}
                      </Text>
                      <View className="flex-row gap-0.5 mt-0.5">
                        {hasWorkout && (
                          <View className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-background' : 'bg-primary'}`} />
                        )}
                        {hasScheduled && (
                          <View className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-background/60' : 'bg-amber-400'}`} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Selected day detail */}
          {selectedDate && (
            <View className="px-4 mt-4">
              <Text className="text-sm font-semibold text-foreground mb-3">
                {selectedDate}
              </Text>

              {/* Scheduled workouts */}
              {selectedScheduled.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs font-medium text-amber-400 mb-2">PLANNED</Text>
                  {selectedScheduled.map((s) => (
                    <View key={s.id} className="mb-2 rounded-xl bg-background-50 p-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-base font-semibold text-foreground flex-1">
                          {s.seriesName}
                        </Text>
                        <View className="rounded-md bg-amber-400/15 px-2 py-1">
                          <Text className="text-xs font-medium text-amber-400">
                            {s.startedWorkoutId ? 'Started' : 'Planned'}
                          </Text>
                        </View>
                      </View>
                      {!s.startedWorkoutId && (
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => handleStartScheduled(s)}
                            disabled={startScheduled.isPending}
                            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2"
                          >
                            <Ionicons name="play" size={16} color="rgb(10, 10, 10)" />
                            <Text className="text-xs font-semibold text-background">Start</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setCancelTarget(s)}
                            className="flex-row items-center justify-center gap-1.5 rounded-lg border border-background-100 px-4 py-2"
                          >
                            <Ionicons name="close-outline" size={16} color="rgb(163, 163, 163)" />
                            <Text className="text-xs text-foreground-muted">Remove</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Completed workouts */}
              {selectedWorkouts.length > 0 && (
                <View className="mb-3">
                  {selectedScheduled.length > 0 && (
                    <Text className="text-xs font-medium text-primary mb-2">COMPLETED</Text>
                  )}
                  {selectedWorkouts.map((w) => {
                    const duration = w.elapsedSeconds > 0
                      ? w.elapsedSeconds
                      : w.completedAt
                        ? Math.floor((parseUTCTimestamp(w.completedAt).getTime() - parseUTCTimestamp(w.startedAt).getTime()) / 1000)
                        : 0;
                    return (
                      <View key={w.id} className="mb-2 rounded-xl bg-background-50 p-4">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-base font-semibold text-foreground flex-1">
                            {w.name || w.workoutTypeName}
                          </Text>
                          <View className="rounded-md bg-primary/15 px-2 py-1">
                            <Text className="text-xs font-medium text-primary">{w.workoutTypeName}</Text>
                          </View>
                        </View>
                        <View className="flex-row gap-4">
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="time-outline" size={13} color="rgb(163, 163, 163)" />
                            <Text className="text-xs text-foreground-muted">{formatDuration(duration)}</Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="barbell-outline" size={13} color="rgb(163, 163, 163)" />
                            <Text className="text-xs text-foreground-muted">{w.exerciseCount} exercises</Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="layers-outline" size={13} color="rgb(163, 163, 163)" />
                            <Text className="text-xs text-foreground-muted">{w.setCount} sets</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* No items */}
              {selectedWorkouts.length === 0 && selectedScheduled.length === 0 && (
                <View className="rounded-xl bg-background-50 p-4 items-center">
                  <Text className="text-sm text-foreground-muted">No workouts on this day</Text>
                </View>
              )}

              {/* Schedule button */}
              <Pressable
                onPress={() => setShowSeriesPicker(true)}
                className="mt-2 rounded-xl border border-dashed border-background-100 py-3 items-center flex-row justify-center gap-1.5"
              >
                <Ionicons name="add" size={18} color="rgb(52, 211, 153)" />
                <Text className="text-sm font-medium text-primary">Schedule Workout</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* Series picker modal */}
      <Modal
        visible={showSeriesPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeriesPicker(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/60" onPress={() => setShowSeriesPicker(false)} />
          <View className="rounded-t-2xl bg-background px-4 pt-4 pb-10" style={{ height: '50%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-base font-bold text-foreground">Schedule Workout</Text>
                <Text className="text-xs text-foreground-muted">{selectedDate}</Text>
              </View>
              <Pressable onPress={() => setShowSeriesPicker(false)} className="p-1">
                <Ionicons name="close" size={22} color="rgb(163, 163, 163)" />
              </Pressable>
            </View>

            {(!allSeries || allSeries.length === 0) ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-sm text-foreground-muted">No workouts yet</Text>
                <Text className="text-xs text-foreground-subtle mt-1">Complete a workout first to schedule it here</Text>
              </View>
            ) : (
              <FlatList
                data={allSeries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSchedule(item.id)}
                    className="flex-row items-center justify-between py-3 border-b border-background-100"
                  >
                    <Text className="text-sm font-medium text-foreground">{item.name}</Text>
                    <Ionicons name="add-circle-outline" size={20} color="rgb(52, 211, 153)" />
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel confirmation */}
      <ConfirmDialog
        visible={!!cancelTarget}
        title="Remove Scheduled Workout"
        message={`Remove ${cancelTarget?.seriesName} from ${cancelTarget?.scheduledDate}?`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (cancelTarget) cancelScheduled.mutate(cancelTarget.id);
          setCancelTarget(null);
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </View>
  );
}
