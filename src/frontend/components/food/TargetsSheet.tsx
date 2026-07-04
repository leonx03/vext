/** TargetsSheet - bottom sheet to set the per-install daily calorie & protein targets. */
import React, { useState, useEffect } from 'react';
import { Modal, Text, TextInput, Pressable } from 'react-native';
import { APP_CONFIG } from '@config/app';

type TargetsSheetProps = {
  visible: boolean;
  calorieTarget: number;
  proteinTarget: number;
  onSave: (calorieTarget: number, proteinTarget: number) => void;
  onClose: () => void;
};

const { calorieTarget: CAL, proteinTarget: PRO } = APP_CONFIG.validation;

export function TargetsSheet({ visible, calorieTarget, proteinTarget, onSave, onClose }: TargetsSheetProps) {
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCalories(String(calorieTarget));
      setProtein(String(proteinTarget));
      setError(null);
    }
  }, [visible, calorieTarget, proteinTarget]);

  const handleSave = () => {
    const cals = parseInt(calories, 10);
    const pro = parseInt(protein, 10);
    if (!Number.isFinite(cals) || cals < CAL.min || cals > CAL.max) {
      setError('Enter a valid calorie target');
      return;
    }
    if (!Number.isFinite(pro) || pro < PRO.min || pro > PRO.max) {
      setError('Enter a valid protein target');
      return;
    }
    onSave(cals, pro);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-background-50 px-6 pb-8 pt-5" onPress={(e) => e.stopPropagation()}>
          <Text className="text-lg font-bold text-foreground mb-4">Daily Targets</Text>

          <Text className="text-sm font-medium text-foreground mb-2">Calorie target (kcal)</Text>
          <TextInput
            className="rounded-xl bg-background-100 px-4 py-3 text-base text-foreground"
            keyboardType="number-pad"
            placeholder="2000"
            placeholderTextColor="rgb(115, 115, 115)"
            value={calories}
            onChangeText={setCalories}
          />

          <Text className="text-sm font-medium text-foreground mb-2 mt-4">Protein target (g)</Text>
          <TextInput
            className="rounded-xl bg-background-100 px-4 py-3 text-base text-foreground"
            keyboardType="number-pad"
            placeholder="150"
            placeholderTextColor="rgb(115, 115, 115)"
            value={protein}
            onChangeText={setProtein}
          />

          {error && <Text className="mt-3 text-xs text-destructive">{error}</Text>}

          <Pressable onPress={handleSave} className="mt-5 rounded-xl bg-primary py-3 items-center">
            <Text className="text-base font-semibold text-background">Save</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
