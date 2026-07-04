/** Body weight model - CRUD operations for the body_weight_entries table. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { BodyWeightEntry, WeeklyAverageWeight } from '@shared/types/bodyWeight';

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

interface WeeklyAverageRow {
  week_start: string;
  avg_weight_kg: number;
  entry_count: number;
}

/**
 * Average body weight per week, most recent week first. Weeks are Monday-anchored: the
 * `week_start` is computed as the Monday on or before each entry's date, so grouping and the
 * returned label are the same value (avoids the year-boundary quirks of strftime('%W')).
 * `%w` is 0=Sunday..6=Saturday, so `(%w + 6) % 7` = days since Monday.
 */
export async function getWeeklyAverages(
  db: SQLite.SQLiteDatabase,
  limit?: number
): Promise<WeeklyAverageWeight[]> {
  const sql = `SELECT
       date(date, '-' || ((CAST(strftime('%w', date) AS INTEGER) + 6) % 7) || ' days') AS week_start,
       AVG(weight_kg) AS avg_weight_kg,
       COUNT(*)       AS entry_count
     FROM body_weight_entries
     GROUP BY week_start
     ORDER BY week_start DESC`;
  const rows =
    limit != null
      ? await db.getAllAsync<WeeklyAverageRow>(`${sql} LIMIT ?`, limit)
      : await db.getAllAsync<WeeklyAverageRow>(sql);
  return rows.map((row) => ({
    weekStart: row.week_start,
    avgWeightKg: row.avg_weight_kg,
    entryCount: row.entry_count,
  }));
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
