/** Formatting utils - date formatting, duration display, and relative time helpers. */
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import type { UnitSystem } from '@shared/types/settings';

/** Parse a database timestamp (SQLite datetime('now') returns UTC without a suffix). */
export function parseUTCTimestamp(timestamp: string): Date {
  return new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatWeight(kg: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const lb = kg * 2.20462;
    return `${Number(lb.toFixed(1))} lb`;
  }
  return `${Number(kg.toFixed(1))} kg`;
}

export function formatDistance(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = meters / 1609.344;
    return `${Number(miles.toFixed(2))} mi`;
  }
  const km = meters / 1000;
  return `${Number(km.toFixed(2))} km`;
}

export function formatDate(isoString: string): string {
  const date = parseUTCTimestamp(isoString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

export function formatTime(isoString: string): string {
  return format(parseUTCTimestamp(isoString), 'h:mm a');
}

export function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(parseUTCTimestamp(isoString), { addSuffix: true });
}

export function formatVolume(kg: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const lb = kg * 2.20462;
    if (lb >= 1000) return `${Number((lb / 1000).toFixed(1))}k lb`;
    return `${Math.round(lb)} lb`;
  }
  if (kg >= 1000) return `${Number((kg / 1000).toFixed(1))}k kg`;
  return `${Math.round(kg)} kg`;
}

export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Format a plain YYYY-MM-DD date (no time/UTC) for display, e.g. "Mon, Jun 29 2026". */
export function formatPlainDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return format(new Date(y, m - 1, d), 'EEE, MMM d yyyy');
}

/** Short rest display, e.g. 45 -> "45s", 120 -> "2 min", 240 -> "4 min". */
export function formatRestShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}

/**
 * Set/rep prescription. AMRAP is an explicit goal type, not inferred from missing reps:
 *   ('range', 3, 6, 8) -> "3 × 6-8"   ('range', 2, 5, null) -> "2 × 5+"
 *   ('amrap', 3, …)     -> "3 × AMRAP"  ('range', 3, null, null) -> "3 sets" (no rep goal)
 */
export function formatPrescription(
  sets: number | null,
  repsMin: number | null,
  repsMax: number | null,
  repGoalType: 'range' | 'amrap' = 'range'
): string {
  const setPart = sets != null ? `${sets} × ` : '';
  if (repGoalType === 'amrap') return `${setPart}AMRAP`;
  if (repsMin == null && repsMax == null) return sets != null ? `${sets} sets` : '—';
  let repPart: string;
  if (repsMax == null) repPart = `${repsMin}+`;
  else if (repsMin === repsMax) repPart = `${repsMin}`;
  else repPart = `${repsMin}-${repsMax}`;
  return `${setPart}${repPart}`;
}

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return String(value);
}
