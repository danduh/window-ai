import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  /** v1.1 additive optional field — used by Phase 6 searchRecipes */
  totalMinutes?: number;
  /** v1.1 additive optional field — used by Phase 6 searchRecipes */
  searchableIngredients?: string[];
}

/**
 * PlanEntry represents a recipe added to the global meal plan.
 * id is crypto.randomUUID(); addedAt is Date.now().
 */
export interface PlanEntry {
  id: string;
  recipeId: string;
  addedAt: number;
  servings?: number;
}

interface RecipeDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
  };
  'meal-plan': {
    key: string;
    value: PlanEntry;
  };
}

const DB_NAME = 'window-ai-recipes';
const DB_VERSION = 2;
const STORE = 'recipes';

let dbPromise: Promise<IDBPDatabase<RecipeDB>> | null = null;

/** Shared IDB connection. Exported so MealPlanStore.ts can reuse the same connection (avoids two-connection upgrade race). */
export const getDB = (): Promise<IDBPDatabase<RecipeDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<RecipeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Run each migration step in sequence based on previous version.
        // A fresh install arrives at oldVersion=0 and runs all blocks.
        // A v1.0 user arrives at oldVersion=1 and only runs the block for v2.
        if (oldVersion < 1) {
          db.createObjectStore('recipes', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('meal-plan', { keyPath: 'id' });
        }
      },
      blocked(currentVersion) {
        console.warn(
          `[RecipePersistence] IDB upgrade blocked — another tab has version ${currentVersion} open. ` +
            `Close other tabs showing this site and reload.`,
        );
      },
      blocking(_cv, _bv, event) {
        (event.target as IDBDatabase).close();
        window.location.reload();
      },
    });
  }
  return dbPromise;
};

/** Returns every persisted recipe, ordered by IndexedDB key. */
export const getRecipes = async (): Promise<Recipe[]> => {
  const db = await getDB();
  return db.getAll(STORE);
};

/** Looks up a single recipe by id; resolves to undefined if missing. */
export const getRecipe = async (id: string): Promise<Recipe | undefined> => {
  const db = await getDB();
  return db.get(STORE, id);
};

/** Upserts a recipe into the store. */
export const saveRecipe = async (recipe: Recipe): Promise<void> => {
  const db = await getDB();
  await db.put(STORE, recipe);
};

/** Removes a recipe by id. No-op if id is unknown. */
export const deleteRecipe = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete(STORE, id);
};

/** Idempotent first-load seed: writes the supplied recipes only when the store is empty. */
export const seedIfEmpty = async (seeds: Recipe[]): Promise<void> => {
  const db = await getDB();
  const count = await db.count(STORE);
  if (count > 0) return;
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(seeds.map((r) => tx.store.put(r)));
  await tx.done;
};

/**
 * Additive upsert. Writes any recipe whose id is not yet present.
 * Does NOT overwrite existing recipes. Returns count of newly inserted recipes.
 */
export const seedIfMissing = async (seeds: Recipe[]): Promise<number> => {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  let inserted = 0;
  for (const seed of seeds) {
    const existing = await tx.store.get(seed.id);
    if (!existing) {
      await tx.store.put(seed);
      inserted++;
    }
  }
  await tx.done;
  return inserted;
};
