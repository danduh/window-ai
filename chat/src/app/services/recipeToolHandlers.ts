// Eight named WebMCP tool handlers for the Recipe Workbench. Pure TS — no React.
// Mutating handlers (scaleRecipe, swapIngredient, addIngredient, removeIngredient)
// route through RecipePersistence.saveRecipe and call notifyRecipeStore() so the
// rendered UI reflects each tool invocation live (RESEARCH §Pitfall #5; AGENT-03).
// Errors throw plain Error — toolAdapter wrappers convert to {error} payloads.

import {
  getRecipes,
  getRecipe,
  saveRecipe,
  type Recipe,
} from './RecipePersistence';
import {
  getActiveRecipeId,
  setActiveRecipeId,
  notifyRecipeStore,
} from './recipeStore';

const roundToTwo = (n: number): number => Math.round(n * 100) / 100;

/** List all saved recipes (id, title, servings). */
export async function executeListRecipes(): Promise<Array<{ id: string; title: string; servings: number }>> {
  const recipes = await getRecipes();
  return recipes.map((r) => ({ id: r.id, title: r.title, servings: r.servings }));
}

/** Get the full details of a recipe by id. Throws if id is unknown. */
export async function executeGetRecipe(input: { id: string }): Promise<Recipe> {
  const { id } = input;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('id must be a non-empty string');
  }
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  return recipe;
}

/**
 * Make the recipe with the given id the currently active one. Subsequent
 * mutating tools default to this recipe when no recipeId is passed.
 */
export async function executeSelectRecipe(input: { id: string }): Promise<{ activeId: string; title: string }> {
  const { id } = input;
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  setActiveRecipeId(id);
  return { activeId: id, title: recipe.title };
}

/**
 * Scale a recipe to a new serving count. All ingredient quantities are scaled
 * proportionally (newQty = oldQty * newServings / oldServings) and rounded to
 * two decimals.
 */
export async function executeScaleRecipe(input: { servings: number; recipeId?: string }): Promise<{ id: string; oldServings: number; newServings: number; factor: number }> {
  const { servings, recipeId } = input;
  if (!Number.isFinite(servings) || servings < 1) {
    throw new Error(`servings must be a positive integer, got ${servings}`);
  }
  const id = recipeId ?? getActiveRecipeId();
  if (!id) throw new Error('No active recipe and no recipeId provided');
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  const factor = servings / recipe.servings;
  const updated: Recipe = {
    ...recipe,
    servings,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: roundToTwo(ing.quantity * factor),
    })),
  };
  await saveRecipe(updated);
  notifyRecipeStore();
  return { id, oldServings: recipe.servings, newServings: servings, factor };
}

/**
 * Replace the first ingredient whose name contains `from` (case-insensitive
 * substring match) with an ingredient named `to`. Quantity and unit are
 * preserved unless `newQuantity` / `newUnit` are passed.
 */
export async function executeSwapIngredient(input: {
  from: string;
  to: string;
  recipeId?: string;
  newQuantity?: number;
  newUnit?: string;
}): Promise<{ id: string; replaced: string; with: string }> {
  const { from, to, recipeId, newQuantity, newUnit } = input;
  if (typeof from !== 'string' || from.length === 0) throw new Error('from must be a non-empty string');
  if (typeof to !== 'string' || to.length === 0) throw new Error('to must be a non-empty string');
  const id = recipeId ?? getActiveRecipeId();
  if (!id) throw new Error('No active recipe and no recipeId provided');
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  const needle = from.toLowerCase();
  const idx = recipe.ingredients.findIndex((ing) => ing.name.toLowerCase().includes(needle));
  if (idx === -1) {
    const available = recipe.ingredients.map((i) => i.name).join(', ');
    throw new Error(`No ingredient matching "${from}" in "${recipe.title}". Available: ${available}`);
  }
  const replacedName = recipe.ingredients[idx].name;
  const updated: Recipe = {
    ...recipe,
    ingredients: recipe.ingredients.map((ing, i) =>
      i === idx
        ? {
            name: to,
            quantity: typeof newQuantity === 'number' ? newQuantity : ing.quantity,
            unit: typeof newUnit === 'string' ? newUnit : ing.unit,
          }
        : ing,
    ),
  };
  await saveRecipe(updated);
  notifyRecipeStore();
  return { id, replaced: replacedName, with: to };
}

/** Append an ingredient (name + numeric quantity + unit) to the active recipe. */
export async function executeAddIngredient(input: {
  name: string;
  quantity: number;
  unit: string;
  recipeId?: string;
}): Promise<{ id: string; added: { name: string; quantity: number; unit: string } }> {
  const { name, quantity, unit, recipeId } = input;
  if (typeof name !== 'string' || name.length === 0) throw new Error('name must be a non-empty string');
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error(`quantity must be a non-negative number, got ${quantity}`);
  if (typeof unit !== 'string' || unit.length === 0) throw new Error('unit must be a non-empty string');
  const id = recipeId ?? getActiveRecipeId();
  if (!id) throw new Error('No active recipe and no recipeId provided');
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  const updated: Recipe = {
    ...recipe,
    ingredients: [...recipe.ingredients, { name, quantity, unit }],
  };
  await saveRecipe(updated);
  notifyRecipeStore();
  return { id, added: { name, quantity, unit } };
}

/** Remove the first ingredient whose name contains `name` (case-insensitive substring match). */
export async function executeRemoveIngredient(input: {
  name: string;
  recipeId?: string;
}): Promise<{ id: string; removed: { name: string; quantity: number; unit: string } }> {
  const { name, recipeId } = input;
  if (typeof name !== 'string' || name.length === 0) throw new Error('name must be a non-empty string');
  const id = recipeId ?? getActiveRecipeId();
  if (!id) throw new Error('No active recipe and no recipeId provided');
  const recipe = await getRecipe(id);
  if (!recipe) throw new Error(`No recipe with id "${id}"`);
  const needle = name.toLowerCase();
  const idx = recipe.ingredients.findIndex((ing) => ing.name.toLowerCase().includes(needle));
  if (idx === -1) throw new Error(`No ingredient matching "${name}" in "${recipe.title}".`);
  const removed = recipe.ingredients[idx];
  const updated: Recipe = {
    ...recipe,
    ingredients: recipe.ingredients.filter((_, i) => i !== idx),
  };
  await saveRecipe(updated);
  notifyRecipeStore();
  return { id, removed };
}

/**
 * Build a consolidated shopping list across all saved recipes (or just one
 * if recipeId is provided). Items with the same lowercase-name+lowercase-unit
 * are summed.
 */
export async function executeGenerateShoppingList(input: { recipeId?: string } = {}): Promise<{ items: Array<{ name: string; quantity: number; unit: string }> }> {
  const { recipeId } = input;
  let recipes: Recipe[];
  if (recipeId) {
    const r = await getRecipe(recipeId);
    if (!r) throw new Error(`No recipe with id "${recipeId}"`);
    recipes = [r];
  } else {
    recipes = await getRecipes();
  }
  const map = new Map<string, { name: string; quantity: number; unit: string }>();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = `${ing.name.toLowerCase()}::${ing.unit.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) existing.quantity += ing.quantity;
      else map.set(key, { ...ing });
    }
  }
  return { items: Array.from(map.values()) };
}
