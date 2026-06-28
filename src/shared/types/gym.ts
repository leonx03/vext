/** Gym types - TypeScript interface for a training location (gym). */
export interface Gym {
  id: string;
  name: string;
  isDefault: boolean;
  /** ISO timestamp when the gym was archived (soft-deleted), or null if active. */
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
}
