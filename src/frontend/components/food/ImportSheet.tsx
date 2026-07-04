/** ImportSheet - full-screen modal to paste a personal seed JSON and import foods/meals/targets. */
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useImportSeed } from '@frontend/hooks/useFood';

type ImportSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function ImportSheet({ visible, onClose }: ImportSheetProps) {
  const [text, setText] = useState('');
  const importSeed = useImportSeed();

  useEffect(() => {
    if (visible) {
      setText('');
      importSeed.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const result = importSeed.data;

  const handleImport = () => {
    if (!text.trim() || importSeed.isPending) return;
    importSeed.mutate(text);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-background-100 px-4 pb-3 pt-14">
          <Pressable onPress={onClose} className="py-1">
            <Text className="text-base text-foreground-muted">Close</Text>
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Import from JSON</Text>
          <Pressable onPress={handleImport} disabled={importSeed.isPending} className="py-1">
            <Text className="text-base font-semibold text-primary">{importSeed.isPending ? '…' : 'Import'}</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 pb-10">
          <Text className="text-sm text-foreground-muted mb-3">
            Paste a JSON object with optional "foods", "meals", and "targets". Items are matched by
            name and updated in place — safe to run more than once.
          </Text>
          <TextInput
            className="min-h-[240px] rounded-xl bg-background-50 px-4 py-3 text-sm text-foreground"
            placeholder={'{\n  "foods": [ … ],\n  "meals": [ … ],\n  "targets": { "calories": 2000, "protein": 165 }\n}'}
            placeholderTextColor="rgb(115, 115, 115)"
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {importSeed.error && (
            <Text className="mt-3 text-sm text-destructive">{(importSeed.error as Error).message}</Text>
          )}

          {result && (
            <View className="mt-4 rounded-xl bg-background-50 p-4">
              <Text className="text-sm font-semibold text-primary mb-1">Import complete</Text>
              <Text className="text-sm text-foreground">
                Foods: {result.foodsCreated} added, {result.foodsUpdated} updated
              </Text>
              <Text className="text-sm text-foreground">
                Meals: {result.mealsCreated} added, {result.mealsUpdated} updated
              </Text>
              {result.targetsSet && <Text className="text-sm text-foreground">Daily targets updated</Text>}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
