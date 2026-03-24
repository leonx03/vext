/** New workout screen - select a workout type to start a new workout session. */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as workoutTypeModel from '@backend/models/workoutType';
import { useDatabase } from '@frontend/hooks/useDatabase';
import { useStartWorkout } from '@frontend/hooks/useWorkout';
import { useTodayScheduledWorkouts, useStartScheduledWorkout } from '@frontend/hooks/useScheduledWorkouts';
import type { WorkoutType } from '@shared/types/workout';
import type { ScheduledWorkout } from '@shared/types/scheduledWorkout';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Strength: 'barbell-outline',
  Cardio: 'heart-outline',
  Flexibility: 'body-outline',
};

type Mode = 'choice' | 'type-picker' | 'planned-picker';

export default function NewWorkoutScreen() {
  const db = useDatabase();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choice');
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const startWorkout = useStartWorkout();
  const { data: todayPlanned } = useTodayScheduledWorkouts();
  const startScheduled = useStartScheduledWorkout();

  const unstartedPlanned = todayPlanned?.filter((s) => !s.startedWorkoutId) ?? [];

  const { data: types, isLoading } = useQuery({
    queryKey: ['workoutTypes'],
    queryFn: () => workoutTypeModel.getAll(db),
  });

  const handleStart = async () => {
    if (!selectedType) return;
    try {
      const workout = await startWorkout.mutateAsync({
        typeId: selectedType.id,
        name: workoutName.trim() || undefined,
      });
      router.replace(`/workout/${workout.id}`);
    } catch (e) {
      // mutation errors shown inline via startWorkout.error
      if (__DEV__) console.warn('Start workout failed:', e);
    }
  };

  const handleStartPlanned = async (s: ScheduledWorkout) => {
    try {
      const workout = await startScheduled.mutateAsync({ scheduledId: s.id, seriesId: s.seriesId });
      router.replace(`/workout/${workout.id}`);
    } catch (e) {
      if (__DEV__) console.warn('Start planned workout failed:', e);
    }
  };

  const handlePlannedPress = () => {
    if (unstartedPlanned.length === 1) {
      handleStartPlanned(unstartedPlanned[0]);
    } else {
      setMode('planned-picker');
    }
  };

  const handleBack = () => {
    if (mode === 'type-picker' || mode === 'planned-picker') {
      setMode('choice');
      setSelectedType(null);
      setWorkoutName('');
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="rgb(52, 211, 153)" />
      </View>
    );
  }

  if (mode === 'choice') {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="rgb(250, 250, 250)" />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">Start Workout</Text>
        </View>

        <View className="px-4 mt-4 gap-4">
          <Pressable
            onPress={() => setMode('type-picker')}
            className="rounded-xl bg-background-50 p-5 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
              <Ionicons name="add-circle-outline" size={24} color="rgb(52, 211, 153)" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-foreground">New Workout</Text>
              <Text className="text-sm text-foreground-muted mt-0.5">
                Start fresh with a workout type
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgb(163, 163, 163)" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/workout/repeat')}
            className="rounded-xl bg-background-50 p-5 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full bg-blue-500/20 items-center justify-center">
              <Ionicons name="repeat-outline" size={24} color="rgb(59, 130, 246)" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-foreground">Repeat Past Workout</Text>
              <Text className="text-sm text-foreground-muted mt-0.5">
                Clone exercises from a previous workout
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgb(163, 163, 163)" />
          </Pressable>

          {unstartedPlanned.length > 0 && (
            <Pressable
              onPress={handlePlannedPress}
              disabled={startScheduled.isPending}
              className="rounded-xl bg-background-50 p-5 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-full bg-amber-400/20 items-center justify-center">
                <Ionicons name="calendar-outline" size={24} color="rgb(251, 191, 36)" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-base font-semibold text-foreground">Start Planned Workout</Text>
                <Text className="text-sm text-foreground-muted mt-0.5">
                  {unstartedPlanned.length === 1
                    ? unstartedPlanned[0].seriesName
                    : `${unstartedPlanned.length} workouts planned for today`}
                </Text>
              </View>
              {unstartedPlanned.length > 1 && (
                <Ionicons name="chevron-forward" size={20} color="rgb(163, 163, 163)" />
              )}
            </Pressable>
          )}
        </View>

        {startScheduled.isPending && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-background/80">
            <ActivityIndicator size="large" color="rgb(52, 211, 153)" />
            <Text className="mt-3 text-sm text-foreground-muted">Starting workout...</Text>
          </View>
        )}
      </View>
    );
  }

  if (mode === 'planned-picker') {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={handleBack} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="rgb(250, 250, 250)" />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">Planned for Today</Text>
        </View>

        <Text className="px-4 mb-3 text-sm text-foreground-muted">
          Choose a planned workout to start
        </Text>

        {startScheduled.error && (
          <Text className="px-4 mb-2 text-xs text-destructive">
            {(startScheduled.error as Error)?.message || 'An error occurred'}
          </Text>
        )}

        {startScheduled.isPending && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-background/80">
            <ActivityIndicator size="large" color="rgb(52, 211, 153)" />
            <Text className="mt-3 text-sm text-foreground-muted">Starting workout...</Text>
          </View>
        )}

        <FlatList
          data={unstartedPlanned}
          keyExtractor={(item) => item.id}
          className="px-4"
          contentContainerClassName="pb-[100px]"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleStartPlanned(item)}
              className="mb-3 rounded-xl bg-background-50 p-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{item.seriesName}</Text>
                </View>
                <View className="rounded-lg bg-primary/15 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-primary">Start</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={handleBack} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="rgb(250, 250, 250)" />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">New Workout</Text>
      </View>

      <View className="px-4 mb-4">
        <Text className="mb-2 text-sm text-foreground-muted">Workout name (optional)</Text>
        <TextInput
          className="rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
          placeholder="e.g. Morning Push Day"
          placeholderTextColor="rgb(115, 115, 115)"
          value={workoutName}
          onChangeText={setWorkoutName}
        />
      </View>

      <Text className="px-4 mb-3 text-sm font-medium text-foreground-muted">Choose workout type</Text>

      <FlatList
        data={types}
        keyExtractor={(item) => item.id}
        className="px-4"
        contentContainerClassName="pb-[100px]"
        renderItem={({ item }) => {
          const isSelected = selectedType?.id === item.id;
          return (
            <Pressable
              onPress={() => setSelectedType(item)}
              className={`mb-3 rounded-xl border-2 p-4 ${
                isSelected ? 'border-primary bg-primary/10' : 'border-transparent bg-background-50'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-full items-center justify-center ${isSelected ? 'bg-primary/20' : 'bg-background-100'}`}>
                  <Ionicons
                    name={TYPE_ICONS[item.name] ?? 'fitness-outline'}
                    size={20}
                    color={isSelected ? 'rgb(52, 211, 153)' : 'rgb(163, 163, 163)'}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`text-base font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-foreground-subtle mt-0.5">
                    {item.fields.map((f) => f.name).join(' · ')}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color="rgb(52, 211, 153)" />}
              </View>
            </Pressable>
          );
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-background-100 px-4 pb-8 pt-4">
        {startWorkout.error && (
          <Text className="text-xs text-destructive text-center mb-2">
            {(startWorkout.error as Error)?.message || 'An error occurred'}
          </Text>
        )}
        <Pressable
          onPress={handleStart}
          disabled={!selectedType || startWorkout.isPending}
          className={`rounded-xl py-4 items-center ${selectedType ? 'bg-primary' : 'bg-background-100'}`}
        >
          <Text className={`text-base font-bold ${selectedType ? 'text-background' : 'text-foreground-subtle'}`}>
            {startWorkout.isPending ? 'Starting...' : 'Start Workout'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
