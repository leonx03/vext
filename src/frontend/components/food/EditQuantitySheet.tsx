/** EditQuantitySheet - bottom sheet to change a logged entry's quantity (macros re-scale on save). */
import React, { useState, useEffect } from 'react';
import { Modal, Text, TextInput, Pressable } from 'react-native';
import type { FoodLogEntry } from '@shared/types/food';

type EditQuantitySheetProps = {
  visible: boolean;
  entry: FoodLogEntry | null;
  onSave: (quantity: number) => void;
  onClose: () => void;
};

export function EditQuantitySheet({ visible, entry, onSave, onClose }: EditQuantitySheetProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && entry) {
      setValue(String(entry.quantity));
      setError(null);
    }
  }, [visible, entry]);

  if (!entry) return null;

  const isMeal = entry.entryType === 'meal';
  const label = isMeal ? 'Servings' : 'Amount';

  const handleSave = () => {
    const q = parseFloat(value);
    if (!Number.isFinite(q) || q <= 0) {
      setError('Enter a valid amount');
      return;
    }
    onSave(q);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-background-50 px-6 pb-8 pt-5" onPress={(e) => e.stopPropagation()}>
          <Text className="text-lg font-bold text-foreground">{entry.name}</Text>
          <Text className="text-xs text-foreground-subtle mb-4">Edit {label.toLowerCase()}</Text>

          <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>
          <TextInput
            className="rounded-xl bg-background-100 px-4 py-3 text-base text-foreground"
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            autoFocus
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
