import { supabase } from './supabase'
import type { Article } from '../types/article'

const ARTICLES_TABLE = 'articles'

export async function storeArticle(content: string, metadata?: Record<string, any>): Promise<Article | null> {
  try {
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .insert([
        {
          content,
          metadata,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error storing article:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error storing article:', error)
    return null
  }
}

export async function getArticle(id: string): Promise<Article | null> {
  try {
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching article:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching article:', error)
    return null
  }
}

export async function getRecentArticles(limit = 10): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent articles:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching recent articles:', error)
    return []
  }
}

export async function deleteAllArticles(): Promise<void> {
  try {
    // First get all article IDs
    const { data: articles, error: fetchError } = await supabase
      .from(ARTICLES_TABLE)
      .select('id');

    if (fetchError) {
      console.error('Error fetching articles for deletion:', fetchError);
      throw fetchError;
    }

    if (!articles || articles.length === 0) {
      console.log('No articles to delete');
      return;
    }

    // Delete all articles using their IDs
    const { error: deleteError } = await supabase
      .from(ARTICLES_TABLE)
      .delete()
      .in('id', articles.map(article => article.id));

    if (deleteError) {
      console.error('Error deleting articles:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${articles.length} articles`);
  } catch (error) {
    console.error('Error deleting articles:', error);
    throw error;
  }
} 