/** ExerciseForm - full-screen modal for creating and editing exercises. */
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@frontend/lib/utils';
import { MUSCLE_GROUP_LABELS, ALL_MUSCLE_GROUPS } from '@shared/constants/muscleGroups';
import { EQUIPMENT_LABELS, ALL_EQUIPMENT } from '@shared/constants/equipment';
import { ExerciseTrackingType, TRACKING_TYPE_LABELS } from '@shared/types/exercise';
import type { Exercise, ExerciseCategory, MuscleGroup, Equipment } from '@shared/types/exercise';

const CATEGORIES: { label: string; value: ExerciseCategory }[] = [
  { label: 'Strength', value: 'strength' as ExerciseCategory },
  { label: 'Cardio', value: 'cardio' as ExerciseCategory },
  { label: 'Flexibility', value: 'flexibility' as ExerciseCategory },
];

const TRACKING_TYPES: { label: string; value: ExerciseTrackingType; hint: string }[] = [
  { label: TRACKING_TYPE_LABELS[ExerciseTrackingType.Weighted], value: ExerciseTrackingType.Weighted, hint: 'kg × reps' },
  { label: TRACKING_TYPE_LABELS[ExerciseTrackingType.Bodyweight], value: ExerciseTrackingType.Bodyweight, hint: 'free load (bw / band / +5kg) × reps' },
  { label: TRACKING_TYPE_LABELS[ExerciseTrackingType.Time], value: ExerciseTrackingType.Time, hint: 'a timed hold in seconds' },
];

type ExerciseFormData = {
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string | null;
  restSeconds: number | null;
  trackingType: ExerciseTrackingType;
};

type ExerciseFormProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ExerciseFormData) => void;
  exercise?: Exercise | null;
};

export function ExerciseForm({ visible, onClose, onSave, exercise }: ExerciseFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength' as ExerciseCategory);
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('bodyweight' as Equipment);
  const [instructions, setInstructions] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [trackingType, setTrackingType] = useState<ExerciseTrackingType>(ExerciseTrackingType.Weighted);

  const isEditing = !!exercise;

  useEffect(() => {
    if (visible && exercise) {
      setName(exercise.name);
      setCategory(exercise.category);
      setPrimaryMuscles(exercise.primaryMuscles);
      setEquipment(exercise.equipment);
      setInstructions(exercise.instructions ?? '');
      setRestSeconds(exercise.restSeconds);
      setTrackingType(exercise.trackingType);
    } else if (visible) {
      setName('');
      setCategory('strength' as ExerciseCategory);
      setPrimaryMuscles([]);
      setEquipment('bodyweight' as Equipment);
      setInstructions('');
      setRestSeconds(null);
      setTrackingType(ExerciseTrackingType.Weighted);
    }
  }, [visible, exercise]);

  const toggleMuscle = (muscle: MuscleGroup) => {
    setPrimaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter an exercise name.');
      return;
    }
    onSave({
      name: trimmedName,
      category,
      primaryMuscles,
      equipment,
      instructions: instructions.trim() || null,
      restSeconds,
      trackingType,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-14">
          <Pressable onPress={onClose} className="py-1">
            <Text className="text-base text-foreground-muted">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-bold text-foreground">
            {isEditing ? 'Edit Exercise' : 'New Exercise'}
          </Text>
          <Pressable onPress={handleSave} className="py-1">
            <Text className="text-base font-semibold text-primary">Save</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 pb-10">
          {/* Name */}
          <Text className="text-sm font-medium text-foreground">Name *</Text>
          <TextInput
            className="mt-2 rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
            placeholder="e.g. Bulgarian Split Squat"
            placeholderTextColor="rgb(115, 115, 115)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Category */}
          <Text className="mt-5 text-sm font-medium text-foreground">Category *</Text>
          <View className="mt-2 flex-row gap-2">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                className={cn(
                  'flex-1 rounded-xl py-3 items-center',
                  category === cat.value ? 'bg-primary' : 'bg-background-50'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-medium',
                    category === cat.value ? 'text-background' : 'text-foreground-muted'
                  )}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tracking type */}
          <Text className="mt-5 text-sm font-medium text-foreground">Tracking</Text>
          <View className="mt-2 gap-2">
            {TRACKING_TYPES.map((t) => {
              const isSelected = trackingType === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setTrackingType(t.value)}
                  className={cn(
                    'flex-row items-center justify-between rounded-xl px-4 py-3',
                    isSelected ? 'bg-primary/20 border border-primary' : 'bg-background-50 border border-transparent'
                  )}
                >
                  <View className="flex-1 pr-2">
                    <Text className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                      {t.label}
                    </Text>
                    <Text className="text-xs text-foreground-subtle">{t.hint}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="rgb(52, 211, 153)" />}
                </Pressable>
              );
            })}
          </View>

          {/* Primary Muscles */}
          <Text className="mt-5 text-sm font-medium text-foreground">Target Muscles</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {ALL_MUSCLE_GROUPS.map((muscle) => {
              const isSelected = primaryMuscles.includes(muscle);
              return (
                <Pressable
                  key={muscle}
                  onPress={() => toggleMuscle(muscle)}
                  className={cn(
                    'rounded-lg px-3 py-2',
                    isSelected ? 'bg-primary/20' : 'bg-background-50'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-medium',
                      isSelected ? 'text-primary' : 'text-foreground-muted'
                    )}
                  >
                    {MUSCLE_GROUP_LABELS[muscle]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Equipment */}
          <Text className="mt-5 text-sm font-medium text-foreground">Equipment</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {ALL_EQUIPMENT.map((equip) => {
              const isSelected = equipment === equip;
              return (
                <Pressable
                  key={equip}
                  onPress={() => setEquipment(equip)}
                  className={cn(
                    'rounded-lg px-3 py-2',
                    isSelected ? 'bg-primary/20' : 'bg-background-50'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-medium',
                      isSelected ? 'text-primary' : 'text-foreground-muted'
                    )}
                  >
                    {EQUIPMENT_LABELS[equip]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Instructions */}
          <Text className="mt-5 text-sm font-medium text-foreground">Instructions</Text>
          <TextInput
            className="mt-2 min-h-[100px] rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
            placeholder="Describe how to perform this exercise..."
            placeholderTextColor="rgb(115, 115, 115)"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            textAlignVertical="top"
          />

          {/* Rest Time */}
          <Text className="mt-5 text-sm font-medium text-foreground">Default Rest Time</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Pressable
              onPress={() => setRestSeconds((prev) => Math.max(15, (prev ?? 60) - 15))}
              className="rounded-lg bg-background-50 px-4 py-2"
            >
              <Text className="text-sm text-foreground-muted">-15s</Text>
            </Pressable>
            <Text className="min-w-[56px] text-center text-base font-medium text-foreground">
              {restSeconds != null ? `${restSeconds}s` : 'Default'}
            </Text>
            <Pressable
              onPress={() => setRestSeconds((prev) => (prev ?? 60) + 15)}
              className="rounded-lg bg-background-50 px-4 py-2"
            >
              <Text className="text-sm text-foreground-muted">+15s</Text>
            </Pressable>
            {restSeconds != null && (
              <Pressable
                onPress={() => setRestSeconds(null)}
                className="ml-1 rounded-lg bg-background-50 px-3 py-2"
              >
                <Text className="text-xs text-foreground-muted">Reset</Text>
              </Pressable>
            )}
          </View>
          <Text className="mt-1 text-xs text-foreground-subtle">
            {restSeconds != null ? 'Custom default' : 'Will use category default'}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
