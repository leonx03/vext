/** Calendar screen - monthly view of completed workouts with day drill-down. */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutsByMonth } from '@frontend/hooks/useHistory';
import { parseUTCTimestamp, formatDuration } from '@shared/utils/formatting';
import type { WorkoutSummary } from '@shared/types/workout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  // Returns 0=Mon, 6=Sun
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: workouts, isLoading } = useWorkoutsByMonth(year, month);

  // Build a map: 'YYYY-MM-DD' -> WorkoutSummary[]
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

  const selectedWorkouts = selectedDate ? (workoutsByDay.get(selectedDate) ?? []) : [];

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);

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

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build grid cells: nulls for empty prefix slots, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-foreground">Calendar</Text>
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
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                  const hasWorkout = workoutsByDay.has(dateKey);
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
                      {hasWorkout && (
                        <View className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-background' : 'bg-primary'}`} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Selected day workouts */}
          {selectedDate && (
            <View className="px-4 mt-4">
              <Text className="text-sm font-semibold text-foreground mb-3">
                {selectedDate}
              </Text>
              {selectedWorkouts.length === 0 ? (
                <View className="rounded-xl bg-background-50 p-4 items-center">
                  <Text className="text-sm text-foreground-muted">No workouts on this day</Text>
                </View>
              ) : (
                selectedWorkouts.map((w) => {
                  const duration = w.elapsedSeconds > 0
                    ? w.elapsedSeconds
                    : w.completedAt
                      ? Math.floor((parseUTCTimestamp(w.completedAt).getTime() - parseUTCTimestamp(w.startedAt).getTime()) / 1000)
                      : 0;
                  return (
                    <View key={w.id} className="mb-3 rounded-xl bg-background-50 p-4">
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
                })
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
