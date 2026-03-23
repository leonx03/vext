/** Body weight service - business logic for logging and retrieving body weight entries. */
import type * as SQLite from 'expo-sqlite';
import * as bodyWeightModel from '@backend/models/bodyWeight';
import type { BodyWeightEntry } from '@shared/types/bodyWeight';

export async function logWeight(
  db: SQLite.SQLiteDatabase,
  weightKg: number,
  date: string,
  notes?: string | null
): Promise<BodyWeightEntry> {
  return bodyWeightModel.upsert(db, weightKg, date, notes);
}

export async function getHistory(db: SQLite.SQLiteDatabase): Promise<BodyWeightEntry[]> {
  return bodyWeightModel.getAll(db);
}

export async function getRecentTrend(db: SQLite.SQLiteDatabase, count: number): Promise<BodyWeightEntry[]> {
  return bodyWeightModel.getRecent(db, count);
}

export async function deleteEntry(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  return bodyWeightModel.remove(db, id);
}
