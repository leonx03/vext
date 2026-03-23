/** Body weight model - CRUD operations for the body_weight_entries table. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { BodyWeightEntry } from '@shared/types/bodyWeight';

interface BodyWeightRow {
  id: string;
  weight_kg: number;
  date: string;
  notes: string | null;
  created_at: string;
}

function mapRow(row: BodyWeightRow): BodyWeightEntry {
  return {
    id: row.id,
    weightKg: row.weight_kg,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getAll(db: SQLite.SQLiteDatabase): Promise<BodyWeightEntry[]> {
  const rows = await db.getAllAsync<BodyWeightRow>(
    'SELECT * FROM body_weight_entries ORDER BY date DESC'
  );
  return rows.map(mapRow);
}

export async function getRecent(db: SQLite.SQLiteDatabase, limit: number): Promise<BodyWeightEntry[]> {
  const rows = await db.getAllAsync<BodyWeightRow>(
    'SELECT * FROM body_weight_entries ORDER BY date DESC LIMIT ?',
    limit
  );
  return rows.map(mapRow);
}

export async function getByDate(db: SQLite.SQLiteDatabase, date: string): Promise<BodyWeightEntry | null> {
  const row = await db.getFirstAsync<BodyWeightRow>(
    'SELECT * FROM body_weight_entries WHERE date = ?',
    date
  );
  return row ? mapRow(row) : null;
}

export async function upsert(
  db: SQLite.SQLiteDatabase,
  weightKg: number,
  date: string,
  notes?: string | null
): Promise<BodyWeightEntry> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO body_weight_entries (id, weight_kg, date, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, notes = excluded.notes`,
    id, weightKg, date, notes ?? null
  );
  const row = await db.getFirstAsync<BodyWeightRow>(
    'SELECT * FROM body_weight_entries WHERE date = ?',
    date
  );
  return mapRow(row!);
}

export async function remove(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM body_weight_entries WHERE id = ?', id);
}
