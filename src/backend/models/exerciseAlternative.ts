/** ExerciseAlternative model - manages per-slot alternative exercises. */
import type * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export interface ExerciseAlternativeRow {
  id: string;
  slot_id: string;
  alternative_exercise_id: string;
  alternative_name: string;
  created_at: string;
}

export interface ExerciseAlternative {
  id: string;
  slotId: string;
  alternativeExerciseId: string;
  alternativeName: string;
  createdAt: string;
}

export async function getAlternatives(
  db: SQLite.SQLiteDatabase,
  slotId: string
): Promise<ExerciseAlternative[]> {
  const rows = await db.getAllAsync<ExerciseAlternativeRow>(
    `SELECT esa.id, esa.slot_id, esa.alternative_exercise_id,
            e.name AS alternative_name, esa.created_at
     FROM exercise_slot_alternatives esa
     JOIN exercises e ON e.id = esa.alternative_exercise_id
     WHERE esa.slot_id = ?
     ORDER BY esa.created_at ASC`,
    slotId
  );
  return rows.map((r) => ({
    id: r.id,
    slotId: r.slot_id,
    alternativeExerciseId: r.alternative_exercise_id,
    alternativeName: r.alternative_name,
    createdAt: r.created_at,
  }));
}

export async function addAlternative(
  db: SQLite.SQLiteDatabase,
  slotId: string,
  alternativeExerciseId: string
): Promise<ExerciseAlternative> {
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT OR IGNORE INTO exercise_slot_alternatives
       (id, slot_id, alternative_exercise_id)
     VALUES (?, ?, ?)`,
    id,
    slotId,
    alternativeExerciseId
  );
  const row = await db.getFirstAsync<ExerciseAlternativeRow>(
    `SELECT esa.id, esa.slot_id, esa.alternative_exercise_id,
            e.name AS alternative_name, esa.created_at
     FROM exercise_slot_alternatives esa
     JOIN exercises e ON e.id = esa.alternative_exercise_id
     WHERE esa.slot_id = ? AND esa.alternative_exercise_id = ?`,
    slotId,
    alternativeExerciseId
  );
  if (!row) throw new Error('Failed to add alternative exercise');
  return {
    id: row.id,
    slotId: row.slot_id,
    alternativeExerciseId: row.alternative_exercise_id,
    alternativeName: row.alternative_name,
    createdAt: row.created_at,
  };
}

export async function removeAlternative(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM exercise_slot_alternatives WHERE id = ?`, id);
}
