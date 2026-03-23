/** Body weight types - TypeScript interfaces for body weight tracking entries. */
export interface BodyWeightEntry {
  id: string;
  weightKg: number;
  date: string; // YYYY-MM-DD
  notes: string | null;
  createdAt: string;
}
