/** GymManager - settings section to add, rename, and archive gyms (training locations). */
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAllGyms,
  useCreateGym,
  useRenameGym,
  useArchiveGym,
  useUnarchiveGym,
} from '@frontend/hooks/useGyms';
import type { Gym } from '@shared/types/gym';

export function GymManager() {
  const { data: gyms } = useAllGyms();
  const createGym = useCreateGym();
  const renameGym = useRenameGym();
  const archiveGym = useArchiveGym();
  const unarchiveGym = useUnarchiveGym();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { active, archived } = useMemo(() => {
    const active: Gym[] = [];
    const archived: Gym[] = [];
    for (const g of gyms ?? []) (g.archivedAt ? archived : active).push(g);
    return { active, archived };
  }, [gyms]);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createGym.mutate(name, { onSuccess: () => setNewName('') });
  };

  const handleSaveEdit = (id: string) => {
    const name = editValue.trim();
    if (name) renameGym.mutate({ id, name });
    setEditingId(null);
  };

  return (
    <View className="mx-4 mt-3 rounded-xl bg-background-50 p-4">
      <Text className="text-sm font-medium text-foreground-muted mb-3">Gyms</Text>

      {/* Active gyms */}
      {active.map((gym) => (
        <View key={gym.id} className="flex-row items-center justify-between py-2 border-b border-background-100">
          {editingId === gym.id ? (
            <>
              <TextInput
                autoFocus
                className="flex-1 h-9 rounded-lg bg-background-100 px-3 text-sm text-foreground mr-2"
                value={editValue}
                onChangeText={setEditValue}
                onSubmitEditing={() => handleSaveEdit(gym.id)}
              />
              <Pressable onPress={() => handleSaveEdit(gym.id)} className="p-1.5">
                <Ionicons name="checkmark" size={18} color="rgb(52, 211, 153)" />
              </Pressable>
              <Pressable onPress={() => setEditingId(null)} className="p-1.5">
                <Ionicons name="close" size={18} color="rgb(163, 163, 163)" />
              </Pressable>
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-2 flex-1">
                <Ionicons name="location-outline" size={18} color="rgb(163, 163, 163)" />
                <Text className="text-base text-foreground">{gym.name}</Text>
                {gym.isDefault && (
                  <View className="rounded-full bg-background-100 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-foreground-subtle">DEFAULT</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => {
                  setEditingId(gym.id);
                  setEditValue(gym.name);
                }}
                className="p-1.5"
              >
                <Ionicons name="pencil-outline" size={16} color="rgb(163, 163, 163)" />
              </Pressable>
              {!gym.isDefault && (
                <Pressable onPress={() => archiveGym.mutate(gym.id)} className="p-1.5">
                  <Ionicons name="archive-outline" size={16} color="rgb(163, 163, 163)" />
                </Pressable>
              )}
            </>
          )}
        </View>
      ))}

      {/* Add gym */}
      <View className="flex-row items-center gap-2 mt-3">
        <TextInput
          className="flex-1 h-10 rounded-lg bg-background-100 px-3 text-sm text-foreground"
          placeholder="Add a gym"
          placeholderTextColor="rgb(115, 115, 115)"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAdd}
        />
        <Pressable
          onPress={handleAdd}
          disabled={createGym.isPending || !newName.trim()}
          className="rounded-lg bg-primary px-4 h-10 items-center justify-center"
        >
          <Text className="text-sm font-semibold text-background">
            {createGym.isPending ? '...' : 'Add'}
          </Text>
        </Pressable>
      </View>
      {createGym.error && (
        <Text className="text-xs text-destructive mt-2">{(createGym.error as Error).message}</Text>
      )}
      {archiveGym.error && (
        <Text className="text-xs text-destructive mt-2">{(archiveGym.error as Error).message}</Text>
      )}

      {/* Archived gyms */}
      {archived.length > 0 && (
        <View className="mt-4">
          <Text className="text-xs font-medium text-foreground-subtle mb-2">Archived</Text>
          {archived.map((gym) => (
            <View key={gym.id} className="flex-row items-center justify-between py-2">
              <Text className="text-sm text-foreground-subtle">{gym.name}</Text>
              <Pressable
                onPress={() => unarchiveGym.mutate(gym.id)}
                className="flex-row items-center gap-1 rounded-lg bg-background-100 px-3 py-1.5"
              >
                <Ionicons name="refresh-outline" size={14} color="rgb(163, 163, 163)" />
                <Text className="text-xs font-medium text-foreground-muted">Restore</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
