// Module-scope IDB CRUD + pub-sub for the meal-plan store.
// Uses the shared getDB() from RecipePersistence.ts to avoid a two-connection
// upgrade race (Pitfall 1). All IDB access goes through the shared getDB export.
import { getDB, type PlanEntry } from './RecipePersistence';

export type { PlanEntry } from './RecipePersistence';

const PLAN_STORE = 'meal-plan';

// ── pub-sub ──────────────────────────────────────────────────────────────────

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to meal-plan store change notifications. Returns an unsubscribe fn. */
export const subscribeMealPlanStore = (l: Listener): (() => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Notify all listeners. Called by every mutating function. */
export const notifyMealPlanStore = (): void => {
  listeners.forEach((l) => l());
};

// ── public API ───────────────────────────────────────────────────────────────

/** Returns all plan entries ordered by addedAt ascending. */
export const getPlan = async (): Promise<PlanEntry[]> => {
  const db = await getDB();
  const all = await db.getAll(PLAN_STORE);
  return all.sort((a, b) => a.addedAt - b.addedAt);
};

/** Adds a new entry to the plan. Caller constructs the PlanEntry with crypto.randomUUID() + Date.now(). */
export const addToPlan = async (entry: PlanEntry): Promise<void> => {
  const db = await getDB();
  await db.put(PLAN_STORE, entry);
  notifyMealPlanStore();
};

/** Removes a single plan entry by its id. No-op if id is unknown. */
export const removeFromPlan = async (entryId: string): Promise<void> => {
  const db = await getDB();
  await db.delete(PLAN_STORE, entryId);
  notifyMealPlanStore();
};

/** Clears all entries from the plan. */
export const clearPlan = async (): Promise<void> => {
  const db = await getDB();
  await db.clear(PLAN_STORE);
  notifyMealPlanStore();
};
