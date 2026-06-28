/** Gym service - business logic for managing training locations (gyms). */
import type * as SQLite from 'expo-sqlite';
import * as gymModel from '@backend/models/gym';
import type { Gym } from '@shared/types/gym';

export async function listGyms(
  db: SQLite.SQLiteDatabase,
  includeArchived = false
): Promise<Gym[]> {
  return gymModel.getAll(db, includeArchived);
}

export async function createGym(db: SQLite.SQLiteDatabase, name: string): Promise<Gym> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Gym name cannot be empty.');
  return gymModel.create(db, trimmed);
}

export async function renameGym(
  db: SQLite.SQLiteDatabase,
  id: string,
  name: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Gym name cannot be empty.');
  await gymModel.rename(db, id, trimmed);
}

export async function archiveGym(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  const gym = await gymModel.getById(db, id);
  if (gym?.isDefault) throw new Error('The default gym cannot be archived.');
  await gymModel.archive(db, id);
}

export async function unarchiveGym(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await gymModel.unarchive(db, id);
}

/** Whether the gym picker should be shown at workout start (≥ 2 active gyms). */
export async function shouldPromptForGym(db: SQLite.SQLiteDatabase): Promise<boolean> {
  return (await gymModel.getActiveCount(db)) >= 2;
}

/** The gym to attribute a session to when no explicit choice is made (single-gym case). */
export async function getDefaultGym(db: SQLite.SQLiteDatabase): Promise<Gym | null> {
  return gymModel.getDefault(db);
}
