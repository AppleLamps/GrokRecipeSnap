import { supabase } from './supabase'
import type { Recipe } from '../types/recipe'

const POPULAR_RECIPES_TABLE = 'popular_recipes'

// Convert Supabase recipe to frontend recipe format
function convertSupabaseRecipe(recipe: any): Recipe {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    imageUrl: recipe.image_url || 'https://via.placeholder.com/400',
    cookTime: recipe.cook_time || '30 mins',
    servings: recipe.servings || 4,
    tags: recipe.tags || [],
    content: recipe.content || '',
    created_at: recipe.created_at,
    popularity_score: recipe.popularity_score || 0,
    macros: recipe.macros || null
  }
}

export async function deleteAllPopularRecipes(): Promise<void> {
  try {
    // First get all recipe IDs
    const { data: recipes, error: fetchError } = await supabase
      .from(POPULAR_RECIPES_TABLE)
      .select('id');

    if (fetchError) {
      console.error('Error fetching recipes for deletion:', fetchError);
      throw fetchError;
    }

    if (!recipes || recipes.length === 0) {
      console.log('No recipes to delete');
      return;
    }

    // Delete all recipes using their IDs
    const { error: deleteError } = await supabase
      .from(POPULAR_RECIPES_TABLE)
      .delete()
      .in('id', recipes.map(recipe => recipe.id));

    if (deleteError) {
      console.error('Error deleting recipes:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${recipes.length} recipes`);
  } catch (error) {
    console.error('Error deleting recipes:', error);
    throw error;
  }
}

export async function storeRecipe(
  title: string,
  description: string,
  ingredients: string[],
  instructions: string[],
  metadata?: {
    imageUrl?: string;
    cookTime?: string;
    servings?: number;
    tags?: string[];
    macros?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
  }
): Promise<Recipe | null> {
  try {
    // Generate content field by combining recipe information
    const content = `
${title}

${description}

Cooking Time: ${metadata?.cookTime || '30 mins'}
Servings: ${metadata?.servings || 4}

Ingredients:
${ingredients.map(ingredient => `- ${ingredient}`).join('\n')}

Instructions:
${instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n')}

${metadata?.tags?.length ? `\nTags: ${metadata.tags.join(', ')}` : ''}
`.trim();

    const { data, error } = await supabase
      .from(POPULAR_RECIPES_TABLE)
      .insert([
        {
          title,
          description,
          ingredients,
          instructions,
          image_url: metadata?.imageUrl,
          cook_time: metadata?.cookTime,
          servings: metadata?.servings || 4,
          tags: metadata?.tags || [],
          created_at: new Date().toISOString(),
          popularity_score: 0,
          content,
          macros: metadata?.macros || null
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error storing recipe:', error)
      return null
    }

    return convertSupabaseRecipe(data)
  } catch (error) {
    console.error('Error storing recipe:', error)
    return null
  }
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from(POPULAR_RECIPES_TABLE)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching recipe:', error)
      return null
    }

    return convertSupabaseRecipe(data)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return null
  }
}

export async function getPopularRecipes(limit = 10): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from(POPULAR_RECIPES_TABLE)
      .select('*')
      .order('popularity_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching popular recipes:', error)
      return []
    }

    return (data || []).map(convertSupabaseRecipe)
  } catch (error) {
    console.error('Error fetching popular recipes:', error)
    return []
  }
}

export async function incrementPopularity(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_recipe_popularity', { recipe_id: id })
    if (error) {
      console.error('Error incrementing recipe popularity:', error)
    }
  } catch (error) {
    console.error('Error incrementing recipe popularity:', error)
  }
}