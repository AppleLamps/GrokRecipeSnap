import { getXaiApiKey } from '@/utils/env';
import { Recipe } from '@/components/RecipeCard';
import { generateImageFromPrompt } from '@/utils/imageService';
import { sleep, setCachedData } from '@/utils/helpers.ts';
import { storeRecipe, getPopularRecipes as getSupabasePopularRecipes } from '@/lib/recipes'
import type { Recipe as SupabaseRecipe } from '@/types/recipe'

// Cache Key Definition
export const CACHE_KEY_POPULAR_RECIPES = 'popular_recipes'

const RECIPE_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'dessert',
  'appetizer',
  'salad',
  'soup',
  'pasta',
  'seafood dish',
  'vegetarian meal',
  'vegan dish',
  'gluten-free option',
  'keto meal',
  'quick meal',
  'gourmet dish',
  'baked goods',
  'casserole',
  'stir-fry',
  'rice dish',
  'sandwich',
  'street food',
  'dip or spread',
  'one-pot meal',
  'slow cooker recipe'
];

const CUISINES = [
  'Italian',
  'Mexican',
  'Japanese',
  'Chinese',
  'Indian',
  'French',
  'Mediterranean',
  'Thai',
  'Korean',
  'American',
  'Middle Eastern',
  'Spanish',
  'Vietnamese',
  'Greek',
  'Moroccan',
  'Lebanese',
  'Ethiopian',
  'Brazilian',
  'Caribbean',
  'Peruvian',
  'Scandinavian',
  'British',
  'German',
  'Turkish',
  'Filipino'
];

// ADDED: New arrays for more variety dimensions
const MAIN_INGREDIENTS = [
  'chicken', 'beef', 'pork', 'lamb', 'salmon', 'tuna', 'shrimp', 'cod',
  'tofu', 'tempeh', 'lentils', 'chickpeas', 'black beans', 'mushrooms',
  'eggplant', 'zucchini', 'potatoes', 'sweet potatoes', 'broccoli', 'cauliflower',
  'eggs', 'quinoa', 'rice', 'pasta'
];

const COOKING_METHODS = [
  'baking', 'roasting', 'grilling', 'frying', 'sautéing', 'stir-frying',
  'steaming', 'poaching', 'boiling', 'simmering', 'braising', 'slow cooking',
  'pressure cooking', 'air frying', 'smoking', 'sous vide'
];

const DIFFICULTY_LEVELS = [
  'very easy', 'easy', 'beginner-friendly', 'intermediate',
  'medium difficulty', 'advanced', 'challenging', 'expert'
];

// Rate limiting configuration
const API_RATE_LIMIT = 3; // requests per second
const API_RATE_WINDOW = 1000; // 1 second in milliseconds
let lastApiCall = 0;

// Error types for better error handling
export class RecipeGenerationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'RecipeGenerationError';
  }
}

// Helper function to enforce rate limiting
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  const minDelay = API_RATE_WINDOW / API_RATE_LIMIT;

  if (timeSinceLastCall < minDelay) {
    const delay = minDelay - timeSinceLastCall;
    await sleep(delay);
  }

  lastApiCall = Date.now();
}

/**
 * Generates a single recipe using the XAI API (internal helper)
 * @returns Promise with the generated recipe
 */
async function _generateSingleRecipe(): Promise<Recipe> {
  const apiKey = getXaiApiKey();

  if (!apiKey) {
    throw new RecipeGenerationError('API key is required for recipe generation');
  }

  // Select random elements for variety
  const recipeType = RECIPE_TYPES[Math.floor(Math.random() * RECIPE_TYPES.length)];
  const cuisine = CUISINES[Math.floor(Math.random() * CUISINES.length)];
  // ADDED: Select from new arrays
  const mainIngredient = MAIN_INGREDIENTS[Math.floor(Math.random() * MAIN_INGREDIENTS.length)];
  const cookingMethod = COOKING_METHODS[Math.floor(Math.random() * COOKING_METHODS.length)];
  const difficulty = DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)];

  // UPDATED: Log more details
  console.log(`[RecipeService] Starting recipe generation for a ${difficulty} ${cuisine} ${recipeType} featuring ${mainIngredient}, prepared by ${cookingMethod}.`);

  // UPDATED: System prompt refined
  const systemPrompt = `You are a professional chef and recipe developer who creates detailed, accurate, and unique recipes.
Generate recipes that are:
1. Clear and easy to follow
2. Include precise measurements and timing
3. Have detailed instructions
4. Specify cook times, prep times, and servings
5. Include relevant tags (cuisine, diet, main ingredient, etc.)
6. Aim for creativity and avoid overly common dishes unless specified.
7. Ensure the description is engaging and appetizing.
8. IMPORTANT: Always respond ONLY with the JSON object containing the recipe details as specified in the user prompt format. Do not include any introductory text, explanations, or markdown formatting outside the JSON structure.`;

  try {
    await enforceRateLimit();

    // UPDATED: Construct a more detailed user prompt
    const userPrompt = `Generate a detailed recipe JSON object for a ${difficulty} ${recipeType} inspired by ${cuisine} cuisine. The recipe should prominently feature ${mainIngredient} and primarily use the ${cookingMethod} cooking method.

Return ONLY the JSON object with the following structure:
{
  "title": "Recipe Title",
  "description": "A brief, appetizing description (2-3 sentences).",
  "ingredients": ["List", "of", "ingredients", "with", "quantities"],
  "instructions": ["Step-by-step", "instructions"],
  "prepTime": "e.g., 15 mins",
  "cookTime": "e.g., 30 mins",
  "totalTime": "e.g., 45 mins",
  "servings": Number (e.g., 4),
  "difficulty": "${difficulty}",
  "tags": ["relevant", "tags", "${cuisine}", "${recipeType}", "${mainIngredient}", "${cookingMethod}"]
}`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-3-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new RecipeGenerationError(`Recipe generation failed with status: ${response.status}`, errorData);
    }

    const data = await response.json();
    console.log('[RecipeService] Successfully received recipe data');

    let recipeData;
    try {
      recipeData = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('[RecipeService] Failed to parse recipe data:', e);
      throw new RecipeGenerationError('Failed to parse recipe response', { content: data.choices[0].message.content });
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'ingredients', 'instructions'];
    const missingFields = requiredFields.filter(field => !recipeData[field]);
    if (missingFields.length > 0) {
      throw new RecipeGenerationError('Recipe is missing required fields', { missingFields, recipeData });
    }

    // Generate Image URL separately after validating core recipe data
    let imageUrl = 'https://via.placeholder.com/400'; // Default fallback
    try {
      await enforceRateLimit(); // Rate limit before image call too
      console.log('[RecipeService] Starting image generation for:', recipeData.title);
      // UPDATED: More descriptive image prompt
      imageUrl = await generateImageFromPrompt(`${recipeData.title} - ${cuisine} ${recipeType} dish featuring ${mainIngredient}, using ${cookingMethod} method`);
      console.log('[RecipeService] Successfully generated recipe image');
    } catch (error) {
      console.error('[RecipeService] Image generation failed, using fallback:', error);
      // Keep the default fallback URL
    }

    // Create the recipe object with validated data and generated image URL
    const recipe: Recipe = {
      id: Date.now().toString() + Math.random().toString(16).substring(2, 8),
      title: recipeData.title,
      description: recipeData.description,
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
      instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
      cookTime: recipeData.cookTime || '30 mins',
      servings: Number(recipeData.servings) || 4,
      tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
      imageUrl
    };

    // Store the recipe in Supabase with all fields
    const storedRecipe = await storeRecipe(
      recipe.title,
      recipe.description,
      recipe.ingredients,
      recipe.instructions,
      {
        imageUrl: recipe.imageUrl,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        tags: recipe.tags
      }
    );

    if (!storedRecipe) {
      throw new RecipeGenerationError('Failed to store recipe in database');
    }

    return recipe;
  } catch (error) {
    console.error('[RecipeService] Error in recipe generation:', error);
    throw error;
  }
}

/**
 * Generates multiple recipes with optimized concurrent requests,
 * calling callbacks as each recipe is generated. Saves successful results to cache.
 * @param count Number of recipes to generate
 * @param onRecipeGenerated Callback function executed when a recipe is successfully generated
 * @param onRecipeError Optional callback function executed when an error occurs generating a specific recipe
 * @param onComplete Optional callback function executed when all generation attempts are finished
 */
export async function generateRecipes(
  count: number = 4,
  onRecipeGenerated: (recipe: Recipe) => void,
  onRecipeError?: (error: any, index: number) => void,
  onComplete?: () => void,
): Promise<void> {
  console.log(`[RecipeService] Starting generation of ${count} recipes.`);
  const startTime = Date.now();

  console.log('[RecipeService] Generating new recipes...');

  const allGeneratedRecipes: Recipe[] = [];
  const usedTitles = new Set<string>();
  const maxRetries = 5;
  const concurrentLimit = 2;
  const maxDuplicateTitles = 8;

  let activePromises = 0;
  const promises: Promise<void>[] = [];

  const generateSingleRecipeWithRetry = async (index: number): Promise<void> => {
    let attempt = 0;
    let duplicateCount = 0;
    while (attempt < maxRetries) {
      try {
        const recipe = await _generateSingleRecipe();

        const normalizedTitle = recipe.title.toLowerCase().trim();
        if (!usedTitles.has(normalizedTitle)) {
            usedTitles.add(normalizedTitle);
            allGeneratedRecipes[index] = recipe;
            onRecipeGenerated(recipe);
            return;
        }

        duplicateCount++;
        console.log(`[RecipeService] Duplicate recipe title detected (attempt ${attempt + 1}), retrying...`);

        if (duplicateCount >= maxDuplicateTitles) {
          console.warn('[RecipeService] Too many duplicate titles, modifying title');
          const randomSuffix = Math.floor(Math.random() * 100);
          recipe.title = `${recipe.title} #${randomSuffix}`;
          if (!usedTitles.has(recipe.title.toLowerCase().trim())) {
              usedTitles.add(recipe.title.toLowerCase().trim());
              allGeneratedRecipes[index] = recipe;
              onRecipeGenerated(recipe);
              return;
          } else {
              console.warn('[RecipeService] Modified title still conflicts, skipping attempt.');
          }
        }

        attempt++;
        await sleep(500 * attempt);

      } catch (error) {
        console.error(`[RecipeService] Attempt ${attempt + 1} for recipe index ${index} failed:`, error);
        attempt++;
        if (attempt === maxRetries) {
          if (onRecipeError) onRecipeError(error, index);
          return;
        }
        await sleep(1000 * attempt);
      }
    }
    const finalError = new RecipeGenerationError(`Failed to generate unique recipe for index ${index} after max retries`);
    if (onRecipeError) onRecipeError(finalError, index);
  };

  // Manage concurrency
  const recipeIndices = Array.from({ length: count }, (_, i) => i);
  let currentIndex = 0;

  const runNext = async () => {
    if (currentIndex >= count) return;
    const indexToProcess = recipeIndices[currentIndex++];
    activePromises++;
    const promise = generateSingleRecipeWithRetry(indexToProcess).finally(() => {
        activePromises--;
        runNext();
    });
    promises.push(promise);
    if (activePromises < concurrentLimit) runNext();
  };

  for (let i = 0; i < Math.min(concurrentLimit, count); i++) runNext();
  await Promise.all(promises);

  // Cache successful results
  const successfulRecipes = allGeneratedRecipes.filter(Boolean);
  if (successfulRecipes.length > 0) {
      setCachedData<Recipe>(CACHE_KEY_POPULAR_RECIPES, successfulRecipes); // Use imported setCachedData
  } else {
      console.warn("[RecipeService] No successful recipes generated, cache not updated.");
  }

  const duration = Date.now() - startTime;
  console.log(`[RecipeService] Recipe generation attempts completed in ${duration}ms.`);
  if (onComplete) onComplete();
}

export async function generateRecipe(imageData: string): Promise<Recipe> {
  const apiKey = getXaiApiKey();
  if (!apiKey) {
    throw new Error('API key is required for recipe generation');
  }

  try {
    // Your existing recipe generation logic here...
    const recipe = await _generateSingleRecipe();

    // Store the recipe in Supabase
    await storeRecipe(
      recipe.title,
      recipe.description,
      recipe.ingredients,
      recipe.instructions,
      {
        imageUrl: recipe.imageUrl,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        tags: recipe.tags
      }
    );

    return recipe;
  } catch (error) {
    console.error('Error in recipe generation:', error);
    throw error;
  }
}

export async function getPopularRecipes(limit = 10): Promise<Recipe[]> {
  try {
    const recipes = await getSupabasePopularRecipes(limit);
    return recipes;
  } catch (error) {
    console.error('Error fetching popular recipes:', error);
    return [];
  }
}