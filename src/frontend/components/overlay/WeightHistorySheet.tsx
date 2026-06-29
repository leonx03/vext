/** WeightHistorySheet - bottom sheet listing the full body weight history with delete. */
import React, { useState } from 'react';
import { Modal, View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmDialog } from '@frontend/components/overlay/ConfirmDialog';
import { formatWeight } from '@shared/utils/formatting';
import type { BodyWeightEntry } from '@shared/types/bodyWeight';
import type { UnitSystem } from '@shared/types/settings';

type WeightHistorySheetProps = {
  visible: boolean;
  entries: BodyWeightEntry[];
  units: UnitSystem;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function WeightHistorySheet({
  visible,
  entries,
  units,
  onDelete,
  onClose,
}: WeightHistorySheetProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string } | null>(null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          className="rounded-t-2xl bg-background-50 pb-8"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between border-b border-background-100 px-6 py-4">
            <Text className="text-lg font-bold text-foreground">Weight History</Text>
            <Pressable onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="rgb(163, 163, 163)" />
            </Pressable>
          </View>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            className="max-h-[70vh]"
            ListEmptyComponent={
              <Text className="text-xs text-foreground-subtle text-center py-6">No entries yet</Text>
            }
            renderItem={({ item }) => (
              <View className="flex-row items-center justify-between px-6 py-3 border-b border-background-100">
                <View>
                  <Text className="text-sm text-foreground">{formatWeight(item.weightKg, units)}</Text>
                  <Text className="text-xs text-foreground-subtle">{item.date}</Text>
                </View>
                <Pressable
                  onPress={() => setDeleteTarget({ id: item.id, date: item.date })}
                  className="p-1.5"
                >
                  <Ionicons name="trash-outline" size={16} color="rgb(163, 163, 163)" />
                </Pressable>
              </View>
            )}
          />
        </Pressable>
      </Pressable>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Entry"
        message={`Delete weight entry for ${deleteTarget?.date}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Modal>
  );
}
