import type { Recipe } from './RecipePersistence';

export const SEED_RECIPES: Recipe[] = [
  {
    id: 'buttermilk-pancakes',
    title: 'Buttermilk Pancakes',
    servings: 4,
    ingredients: [
      { name: 'flour', quantity: 200, unit: 'g' },
      { name: 'buttermilk', quantity: 240, unit: 'ml' },
      { name: 'eggs', quantity: 2, unit: 'piece' },
      { name: 'sugar', quantity: 2, unit: 'tbsp' },
      { name: 'baking powder', quantity: 1, unit: 'tsp' },
      { name: 'salt', quantity: 0.5, unit: 'tsp' },
    ],
    steps: [
      'Whisk flour, sugar, baking powder, and salt in a bowl.',
      'In a separate bowl, beat eggs and buttermilk together.',
      'Combine the wet and dry mixtures; stir until just combined (lumps are fine).',
      'Heat a non-stick skillet over medium heat and ladle on the batter.',
      'Cook 2 minutes per side, until bubbles set and edges look dry.',
      'Serve warm with maple syrup.',
    ],
  },
  {
    id: 'tomato-pasta',
    title: 'Tomato Pasta',
    servings: 2,
    ingredients: [
      { name: 'spaghetti', quantity: 200, unit: 'g' },
      { name: 'crushed tomatoes', quantity: 400, unit: 'g' },
      { name: 'garlic cloves', quantity: 2, unit: 'piece' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'basil leaves', quantity: 6, unit: 'piece' },
      { name: 'salt', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Bring a large pot of salted water to a boil and cook spaghetti to al dente.',
      'Meanwhile, warm olive oil in a saucepan and sauté sliced garlic until fragrant.',
      'Pour in crushed tomatoes, season with salt, and simmer for 8 minutes.',
      'Drain pasta and toss it with the sauce.',
      'Tear basil over the top and serve.',
    ],
  },
];
