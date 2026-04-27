import {
  executeListRecipes,
  executeGetRecipe,
  executeSelectRecipe,
  executeScaleRecipe,
  executeSwapIngredient,
  executeAddIngredient,
  executeRemoveIngredient,
  executeGenerateShoppingList,
} from './recipeToolHandlers';
// `ModelContextTool` is ambient (declared in chat/src/app/types/webmcp.d.ts);
// no import path — tsconfig.app.json `include: ["src/**/*.ts"]` picks it up.

/**
 * Canonical WebMCP tool registry for the Recipe Workbench. Single source of
 * truth: registered with navigator.modelContext on page mount AND adapted to
 * LanguageModel.create({tools}) for the in-page chat agent (see toolAdapter.ts).
 *
 * Tool name format conforms to the W3C WebMCP spec: `[A-Za-z0-9_\-.]{1,128}`.
 * Order: read-only → state-only → mutators (matches RESEARCH.md line 606).
 */
export const RECIPE_TOOLS: ModelContextTool[] = [
  {
    name: 'listRecipes',
    description: 'List all saved recipes with id, title, and serving count. Use this to see what recipes are available before scaling, swapping, or generating a shopping list.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: executeListRecipes,
  },
  {
    name: 'getRecipe',
    description: 'Get the full details of a recipe by id, including ingredients (name + quantity + unit) and ordered steps.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Recipe id (e.g. "buttermilk-pancakes")' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: executeGetRecipe,
  },
  {
    name: 'generateShoppingList',
    description: 'Generate a consolidated shopping list across all saved recipes. Ingredients with the same name+unit are summed. If a recipeId is provided, only that recipe is used.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string', description: '(optional) recipe id; defaults to all recipes' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: executeGenerateShoppingList,
  },
  {
    name: 'selectRecipe',
    description: 'Make a recipe the currently active one in the workbench. Subsequent tools (scaleRecipe, swapIngredient, etc.) operate on the active recipe by default.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Recipe id to make active' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    execute: executeSelectRecipe,
  },
  {
    name: 'scaleRecipe',
    description: 'Scale a recipe to a new serving count. All ingredient quantities are scaled proportionally (newQty = oldQty * newServings / oldServings). Operates on the active recipe unless recipeId is provided.',
    inputSchema: {
      type: 'object',
      properties: {
        servings: { type: 'integer', minimum: 1, description: 'Target servings count' },
        recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
      },
      required: ['servings'],
      additionalProperties: false,
    },
    execute: executeScaleRecipe,
  },
  {
    name: 'swapIngredient',
    description: 'Replace an ingredient name in the active recipe. Matches the first ingredient whose name contains the search term (case-insensitive substring). Quantity and unit are preserved unless overrides are passed.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Ingredient name to replace (case-insensitive substring match — "milk" matches "buttermilk")' },
        to: { type: 'string', description: 'New ingredient name' },
        recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
        newQuantity: { type: 'number', minimum: 0, description: '(optional) override quantity' },
        newUnit: { type: 'string', description: '(optional) override unit' },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
    execute: executeSwapIngredient,
  },
  {
    name: 'addIngredient',
    description: 'Add a new ingredient to the active recipe. quantity is a positive number; unit is a free-form string like "g", "ml", "cup", "tbsp", "tsp", "piece".',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Ingredient name' },
        quantity: { type: 'number', minimum: 0, description: 'Numeric quantity' },
        unit: { type: 'string', description: 'Unit (g, ml, cup, tbsp, tsp, piece, …)' },
        recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
      },
      required: ['name', 'quantity', 'unit'],
      additionalProperties: false,
    },
    execute: executeAddIngredient,
  },
  {
    name: 'removeIngredient',
    description: 'Remove an ingredient from the active recipe by name (case-insensitive substring match, same matcher as swapIngredient).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Ingredient name to remove (case-insensitive substring match)' },
        recipeId: { type: 'string', description: '(optional) recipe id; defaults to active recipe' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    execute: executeRemoveIngredient,
  },
];
