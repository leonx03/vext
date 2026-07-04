/** FoodFormSheet - full-screen modal for creating/editing a food and its per-serving macros. */
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { cn } from '@frontend/lib/utils';
import { SERVING_UNITS, MACRO_COLORS } from '@shared/constants/macros';
import type { FoodItem, FoodItemInput, ServingUnit } from '@shared/types/food';

type FoodFormSheetProps = {
  visible: boolean;
  food?: FoodItem | null;
  onSave: (input: FoodItemInput) => void;
  onClose: () => void;
};

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function FoodFormSheet({ visible, food, onSave, onClose }: FoodFormSheetProps) {
  const [name, setName] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!food;

  useEffect(() => {
    if (!visible) return;
    if (food) {
      setName(food.name);
      setServingSize(String(food.servingSize));
      setServingUnit(food.servingUnit);
      setCalories(String(food.calories));
      setProtein(String(food.proteinG));
      setCarbs(String(food.carbsG));
      setFat(String(food.fatG));
    } else {
      setName('');
      setServingSize('100');
      setServingUnit('g');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
    setError(null);
  }, [visible, food]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a food name');
      return;
    }
    const size = parseNum(servingSize);
    if (!(size > 0)) {
      setError('Enter a valid serving size');
      return;
    }
    const macros = [calories, protein, carbs, fat].map(parseNum);
    if (macros.some((m) => !Number.isFinite(m) || m < 0)) {
      setError('Enter valid macro values (0 or more)');
      return;
    }
    onSave({
      name: trimmed,
      servingSize: size,
      servingUnit,
      calories: macros[0],
      proteinG: macros[1],
      carbsG: macros[2],
      fatG: macros[3],
    });
    onClose();
  };

  const macroInput = (
    label: string,
    value: string,
    setter: (v: string) => void,
    color: string,
    placeholder: string
  ) => (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5 mb-1.5">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-xs font-medium text-foreground-muted">{label}</Text>
      </View>
      <TextInput
        className="rounded-xl bg-background-50 px-3 py-3 text-base text-foreground"
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="rgb(115, 115, 115)"
        value={value}
        onChangeText={setter}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-14">
          <Pressable onPress={onClose} className="py-1">
            <Text className="text-base text-foreground-muted">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-bold text-foreground">{isEditing ? 'Edit Food' : 'New Food'}</Text>
          <Pressable onPress={handleSave} className="py-1">
            <Text className="text-base font-semibold text-primary">Save</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 pb-10">
          <Text className="text-sm font-medium text-foreground">Name *</Text>
          <TextInput
            className="mt-2 rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
            placeholder="e.g. Chicken breast"
            placeholderTextColor="rgb(115, 115, 115)"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
          />

          <Text className="mt-5 text-sm font-medium text-foreground">Serving *</Text>
          <Text className="mt-1 text-xs text-foreground-subtle">Macros below are per this amount.</Text>
          <View className="mt-2 flex-row gap-2">
            <TextInput
              className="w-24 rounded-xl bg-background-50 px-4 py-3 text-base text-foreground"
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor="rgb(115, 115, 115)"
              value={servingSize}
              onChangeText={setServingSize}
            />
            <View className="flex-1 flex-row gap-2">
              {SERVING_UNITS.map((u) => (
                <Pressable
                  key={u.value}
                  onPress={() => setServingUnit(u.value)}
                  className={cn(
                    'flex-1 rounded-xl py-3 items-center justify-center',
                    servingUnit === u.value ? 'bg-primary' : 'bg-background-50'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      servingUnit === u.value ? 'text-background' : 'text-foreground-muted'
                    )}
                  >
                    {u.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text className="mt-5 text-sm font-medium text-foreground">Macros per serving *</Text>
          <View className="mt-2 flex-row gap-2">
            {macroInput('Calories', calories, setCalories, MACRO_COLORS.calories, 'kcal')}
            {macroInput('Protein', protein, setProtein, MACRO_COLORS.protein, 'g')}
          </View>
          <View className="mt-3 flex-row gap-2">
            {macroInput('Carbs', carbs, setCarbs, MACRO_COLORS.carbs, 'g')}
            {macroInput('Fat', fat, setFat, MACRO_COLORS.fat, 'g')}
          </View>

          {error && <Text className="mt-4 text-sm text-destructive">{error}</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}
