/** SupersetGroup model - manages superset groups that link multiple exercises in a workout. */
import * as Crypto from 'expo-crypto';
import type * as SQLite from 'expo-sqlite';
import type { SupersetGroup } from '@shared/types/workout';

interface SupersetGroupRow {
  id: string;
  workout_id: string;
  rest_seconds: number;
  created_at: string;
}

function mapRow(row: SupersetGroupRow): SupersetGroup {
  return {
    id: row.id,
    workoutId: row.workout_id,
    restSeconds: row.rest_seconds,
    createdAt: row.created_at,
  };
}

export async function create(
  db: SQLite.SQLiteDatabase,
  workoutId: string,
  restSeconds: number = 90
): Promise<SupersetGroup> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO superset_groups (id, workout_id, rest_seconds, created_at) VALUES (?, ?, ?, datetime('now'))`,
    id,
    workoutId,
    restSeconds
  );
  const row = await db.getFirstAsync<SupersetGroupRow>(`SELECT * FROM superset_groups WHERE id = ?`, id);
  if (!row) throw new Error(`Failed to create superset group`);
  return mapRow(row);
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<SupersetGroup | null> {
  const row = await db.getFirstAsync<SupersetGroupRow>(`SELECT * FROM superset_groups WHERE id = ?`, id);
  return row ? mapRow(row) : null;
}

export async function getByWorkout(
  db: SQLite.SQLiteDatabase,
  workoutId: string
): Promise<SupersetGroup[]> {
  const rows = await db.getAllAsync<SupersetGroupRow>(
    `SELECT * FROM superset_groups WHERE workout_id = ?`,
    workoutId
  );
  return rows.map(mapRow);
}

export async function updateRestSeconds(
  db: SQLite.SQLiteDatabase,
  id: string,
  restSeconds: number
): Promise<void> {
  await db.runAsync(`UPDATE superset_groups SET rest_seconds = ? WHERE id = ?`, restSeconds, id);
}

export async function deleteGroup(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM superset_groups WHERE id = ?`, id);
}
