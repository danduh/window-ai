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
}

interface RecipeDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
  };
}

const DB_NAME = 'window-ai-recipes';
const DB_VERSION = 1;
const STORE = 'recipes';

let dbPromise: Promise<IDBPDatabase<RecipeDB>> | null = null;

const getDB = (): Promise<IDBPDatabase<RecipeDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<RecipeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
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
