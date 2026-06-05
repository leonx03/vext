/** ExerciseOptionNote model - notes attached to an exercise option (per-series, per-alternative). */
import type * as SQLite from 'expo-sqlite';

/**
 * Sets (upserts) the note for an exercise option. Because an option is shared by
 * every workout in its series, the note shows on each session of that series and
 * stays unique per alternative. An empty/whitespace-only note deletes the row.
 */
export async function setNote(
  db: SQLite.SQLiteDatabase,
  exerciseOptionId: string,
  notes: string
): Promise<void> {
  const trimmed = notes.trim();

  if (!trimmed) {
    await db.runAsync(
      `DELETE FROM exercise_option_notes WHERE exercise_option_id = ?`,
      exerciseOptionId
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO exercise_option_notes (exercise_option_id, notes)
     VALUES (?, ?)
     ON CONFLICT(exercise_option_id)
     DO UPDATE SET notes = excluded.notes, updated_at = datetime('now')`,
    exerciseOptionId,
    trimmed
  );
}
