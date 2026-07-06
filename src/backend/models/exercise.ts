/** Exercise model - CRUD operations for the exercises table (default + custom). */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  Exercise,
  ExerciseCategory,
  ExerciseTrackingType,
  Equipment,
  MuscleGroup,
} from '@shared/types/exercise';

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  primary_muscles: string;
  equipment: string;
  instructions: string | null;
  rest_seconds: number | null;
  tracking_type: string;
  is_default: number;
  archived_at: string | null;
  created_at: string;
}

function safeParseMuscles(json: string): MuscleGroup[] {
  try {
    return JSON.parse(json) as MuscleGroup[];
  } catch {
    return [];
  }
}

function mapRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    primaryMuscles: safeParseMuscles(row.primary_muscles),
    equipment: row.equipment as Equipment,
    instructions: row.instructions,
    restSeconds: row.rest_seconds,
    trackingType: (row.tracking_type as ExerciseTrackingType) ?? ExerciseTrackingType.Weighted,
    isDefault: row.is_default === 1,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function getAll(db: SQLite.SQLiteDatabase): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE archived_at IS NULL ORDER BY name`
  );
  return rows.map(mapRow);
}

export async function getByCategory(
  db: SQLite.SQLiteDatabase,
  category: ExerciseCategory
): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE category = ? AND archived_at IS NULL ORDER BY name`,
    category
  );
  return rows.map(mapRow);
}

export async function search(
  db: SQLite.SQLiteDatabase,
  query: string
): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE name LIKE ? AND archived_at IS NULL ORDER BY name`,
    `%${query}%`
  );
  return rows.map(mapRow);
}

export async function getById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id = ?`,
    id
  );
  return row ? mapRow(row) : null;
}

export async function getByIds(
  db: SQLite.SQLiteDatabase,
  ids: string[]
): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id IN (${placeholders})`,
    ...ids
  );
  return rows.map(mapRow);
}

export async function create(
  db: SQLite.SQLiteDatabase,
  data: {
    name: string;
    category: ExerciseCategory;
    primaryMuscles: MuscleGroup[];
    equipment: Equipment;
    instructions?: string | null;
    restSeconds?: number | null;
    trackingType?: ExerciseTrackingType;
  }
): Promise<Exercise> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO exercises (id, name, category, primary_muscles, equipment, instructions, rest_seconds, tracking_type, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    id,
    data.name,
    data.category,
    JSON.stringify(data.primaryMuscles),
    data.equipment,
    data.instructions ?? null,
    data.restSeconds ?? null,
    data.trackingType ?? ExerciseTrackingType.Weighted
  );
  const exercise = await getById(db, id);
  if (!exercise) throw new Error(`Failed to create exercise with id ${id}`);
  return exercise;
}

export async function update(
  db: SQLite.SQLiteDatabase,
  id: string,
  data: {
    name?: string;
    category?: ExerciseCategory;
    primaryMuscles?: MuscleGroup[];
    equipment?: Equipment;
    instructions?: string | null;
    restSeconds?: number | null;
    trackingType?: ExerciseTrackingType;
  }
): Promise<Exercise> {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.primaryMuscles !== undefined) { fields.push('primary_muscles = ?'); values.push(JSON.stringify(data.primaryMuscles)); }
  if (data.equipment !== undefined) { fields.push('equipment = ?'); values.push(data.equipment); }
  if (data.instructions !== undefined) { fields.push('instructions = ?'); values.push(data.instructions); }
  if (data.restSeconds !== undefined) { fields.push('rest_seconds = ?'); values.push(data.restSeconds); }
  if (data.trackingType !== undefined) { fields.push('tracking_type = ?'); values.push(data.trackingType); }

  if (fields.length === 0) {
    const exercise = await getById(db, id);
    if (!exercise) throw new Error(`Exercise not found: ${id}`);
    return exercise;
  }

  values.push(id);
  await db.runAsync(
    `UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
  const exercise = await getById(db, id);
  if (!exercise) throw new Error(`Exercise not found: ${id}`);
  return exercise;
}

export async function updateRestSeconds(
  db: SQLite.SQLiteDatabase,
  id: string,
  restSeconds: number | null
): Promise<void> {
  await db.runAsync(
    `UPDATE exercises SET rest_seconds = ? WHERE id = ?`,
    restSeconds,
    id
  );
}

export async function archive(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE exercises SET archived_at = datetime('now') WHERE id = ?`,
    id
  );
}
