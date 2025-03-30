import { supabase } from './supabase'
import type { FoodArticle } from '../types/foodArticle'

const FOOD_ARTICLES_TABLE = 'food_articles'

export async function storeFoodArticle(
  title: string,
  content: string,
  category: string,
  tags?: string[],
  metadata?: Record<string, any>
): Promise<FoodArticle | null> {
  try {
    const { data, error } = await supabase
      .from(FOOD_ARTICLES_TABLE)
      .insert([
        {
          title,
          content,
          category,
          tags,
          metadata,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error storing food article:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error storing food article:', error)
    return null
  }
}

export async function getFoodArticle(id: string): Promise<FoodArticle | null> {
  try {
    const { data, error } = await supabase
      .from(FOOD_ARTICLES_TABLE)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching food article:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching food article:', error)
    return null
  }
}

export async function getRecentFoodArticles(
  limit = 10,
  category?: string
): Promise<FoodArticle[]> {
  try {
    let query = supabase
      .from(FOOD_ARTICLES_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching food articles:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching food articles:', error)
    return []
  }
}

export async function getFoodArticlesByTags(tags: string[], limit = 10): Promise<FoodArticle[]> {
  try {
    const { data, error } = await supabase
      .from(FOOD_ARTICLES_TABLE)
      .select('*')
      .contains('tags', tags)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching food articles by tags:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching food articles by tags:', error)
    return []
  }
}

export async function deleteAllFoodArticles(): Promise<void> {
  try {
    // First get all article IDs
    const { data: articles, error: fetchError } = await supabase
      .from(FOOD_ARTICLES_TABLE)
      .select('id');

    if (fetchError) {
      console.error('Error fetching food articles for deletion:', fetchError);
      throw fetchError;
    }

    if (!articles || articles.length === 0) {
      console.log('No food articles to delete');
      return;
    }

    // Delete all articles using their IDs
    const { error: deleteError } = await supabase
      .from(FOOD_ARTICLES_TABLE)
      .delete()
      .in('id', articles.map(article => article.id));

    if (deleteError) {
      console.error('Error deleting food articles:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${articles.length} food articles`);
  } catch (error) {
    console.error('Error deleting food articles:', error);
    throw error;
  }
} 