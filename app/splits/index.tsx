/** Splits list screen - browse splits, create a new one, drill into the editor. */
import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSplits, useCreateSplit } from '@frontend/hooks/useSplits';
import { EmptyState } from '@frontend/components/EmptyState';
import { cn } from '@frontend/lib/utils';

export default function SplitsListScreen() {
  const router = useRouter();
  const { data: splits, isLoading } = useSplits();
  const createSplit = useCreateSplit();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const split = await createSplit.mutateAsync({ name: trimmed });
    setName('');
    setShowCreate(false);
    router.push(`/splits/${split.id}`);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1">
            <Ionicons name="chevron-back" size={24} color="rgb(163, 163, 163)" />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Splits</Text>
        </View>
        <Pressable onPress={() => setShowCreate(true)} className="p-2 rounded-lg bg-background-50">
          <Ionicons name="add" size={22} color="rgb(52, 211, 153)" />
        </Pressable>
      </View>

      <FlatList
        data={splits}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4"
        contentContainerClassName={cn((splits?.length ?? 0) === 0 ? 'flex-1' : 'pb-[100px]')}
        ListEmptyComponent={
          isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="rgb(52, 211, 153)" />
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No splits yet"
              message="Create a split to plan workouts and rest days across weeks"
              actionLabel="New Split"
              onAction={() => setShowCreate(true)}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/splits/${item.id}`)}
            className="mb-2 rounded-xl bg-background-50 p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                {item.description ? (
                  <Text className="mt-0.5 text-xs text-foreground-muted">{item.description}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgb(115, 115, 115)" />
            </View>
          </Pressable>
        )}
      />

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/60" onPress={() => setShowCreate(false)}>
          <Pressable className="mx-8 w-full max-w-sm rounded-2xl bg-background-50 p-6" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-foreground">New Split</Text>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder="e.g. Push / Pull / Legs"
              placeholderTextColor="rgb(115, 115, 115)"
              className="mt-4 rounded-lg border border-background-100 px-3 py-2.5 text-foreground"
              onSubmitEditing={handleCreate}
            />
            {createSplit.error ? (
              <Text className="mt-2 text-xs text-destructive">{createSplit.error.message}</Text>
            ) : null}
            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable onPress={() => { setShowCreate(false); setName(''); }} className="rounded-lg border border-background-100 px-4 py-2.5">
                <Text className="text-sm font-medium text-foreground-muted">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!name.trim() || createSplit.isPending}
                className={cn('rounded-lg px-4 py-2.5', !name.trim() ? 'bg-primary/40' : 'bg-primary')}
              >
                <Text className="text-sm font-semibold text-background">Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
