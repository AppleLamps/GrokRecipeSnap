import { getXaiApiKey } from '@/utils/env';
import { generateImageFromPrompt } from '@/utils/imageService';
import { sleep, setCachedData, CACHE_DURATION_MS } from '@/utils/helpers.ts';
import { storeFoodArticle } from '@/lib/foodArticles'
import { storeArticle } from '@/lib/articles'
import type { Article as GeneratedArticle } from '@/types/article'

// Rate limiting configuration
const API_RATE_LIMIT = 3; // requests per second
const API_RATE_WINDOW = 1000; // 1 second in milliseconds
let lastApiCall = 0;

// Cache Key Definitions
export const CACHE_KEY_INDEX_ARTICLES = 'indexArticlesCache';
export const CACHE_KEY_ARTICLES_PAGE = 'articlesPageCache';

interface CachedData<T> {
  timestamp: number;
  data: T[];
}

// Helper to get cached data
function getCachedData<T>(key: string): T[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const parsed: CachedData<T> = JSON.parse(cached);
    const now = Date.now();
    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      console.log(`[Cache] Using fresh cache for key: ${key}`);
      return parsed.data;
    } else {
      console.log(`[Cache] Cache expired for key: ${key}`);
      localStorage.removeItem(key); // Remove expired cache
      return null;
    }
  } catch (e) {
    console.error(`[Cache] Error parsing cache for key ${key}:`, e);
    localStorage.removeItem(key); // Remove corrupted cache
    return null;
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

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  imageUrl: string;
  readTime: string;
  publishedAt: string;
  tags: string[];
}

// --- Error Types ---
export class ArticleGenerationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ArticleGenerationError';
  }
}

export class ApiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiRateLimitError';
  }
}

/**
 * Internal function to generate article content and image for a GIVEN topic.
 * Handles API calls, parsing, image generation, and object creation.
 */
async function _generateArticleForTopic(topic: string, storeInFoodArticles: boolean = true): Promise<Article> {
  const apiKey = getXaiApiKey();
  const FALLBACK_IMAGE_URL = 'https://source.unsplash.com/800x400/?food,cooking'; // Added cooking keyword
  
  if (!apiKey) {
    throw new ArticleGenerationError('API key is required for article generation');
  }

  try {
    await enforceRateLimit();
    
    console.log(`[ArticleService] Starting article generation for topic: "${topic}"`);
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [
          {
            role: "system",
            content: `You are a professional food writer and culinary expert who creates engaging, informative articles about food, cooking techniques, kitchen tips, and related topics.

Write articles that are:
1. Informative and educational
2. Engaging and conversational in tone
3. Well-structured with clear sections using markdown formatting
4. Include practical tips and insights
5. 300-500 words in length (adjusted for potentially broader topics)

Format the content using proper markdown:
- Use ## for main section headers
- Use ### for subsection headers
- Use bullet points (- ) for lists
- Use numbered lists (1. ) for steps or sequences
- Use **bold** for emphasis
- Add blank lines between paragraphs and sections
- Use > for important tips or callouts

Return ONLY a valid JSON object with this exact structure (no markdown code blocks, no backticks):
{
  "title": "Engaging title relevant to the provided topic",
  "summary": "Brief 1-2 sentence summary",
  "content": "The full article content with markdown formatting",
  "tags": ["relevant", "topic", "tags"],
  "readTime": "X min read"
}`
          },
          {
            role: "user",
            content: `Write a well-structured article about the following topic: "${topic}". Generate an engaging title relevant to this specific topic. Include an introduction, key sections (like tips, techniques, examples, benefits, etc. as appropriate for the topic), and a conclusion. Use proper markdown formatting as specified.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ArticleGenerationError(
        `Article content generation failed for topic "${topic}" with status: ${response.status}`,
        errorData
      );
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    console.log(`[ArticleService] Article content generation completed for topic: "${topic}"`);
    
    let articleData;
    try {
      articleData = JSON.parse(content);
    } catch (e) {
      console.warn(`[ArticleService] Direct JSON parsing failed for topic "${topic}", attempting cleanup`);
      content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      try {
        articleData = JSON.parse(content);
      } catch (e) {
        console.error(`[ArticleService] Failed to parse article data for topic "${topic}":`, e);
        throw new ArticleGenerationError(`Failed to parse article data for topic "${topic}"`, { content });
      }
    }

    if (!articleData.title || !articleData.content || !articleData.summary) {
      console.error(`[ArticleService] Invalid article data for topic "${topic}":`, articleData);
      throw new ArticleGenerationError(`Generated article for topic "${topic}" is missing required fields`, articleData);
    }
    
    // Use the *generated* title for the image prompt for better relevance
    const imagePrompt = articleData.title; 
    let generatedImageUrl = FALLBACK_IMAGE_URL;
    try {
      await enforceRateLimit(); // Apply rate limit before image generation too
      console.log(`[ArticleService] Starting image generation for: "${imagePrompt}"`);
      generatedImageUrl = await generateImageFromPrompt(imagePrompt);
      console.log(`[ArticleService] Image generation completed for: "${imagePrompt}"`);
    } catch (imageError) {
      console.error(`[ArticleService] Error generating image for topic "${topic}" (prompt: "${imagePrompt}"):`, imageError);
      // Continue with fallback URL
    }

    const article: Article = {
      id: `article-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: articleData.title,
      content: articleData.content,
      summary: articleData.summary,
      imageUrl: generatedImageUrl,
      readTime: articleData.readTime || '4 min read',
      publishedAt: new Date().toISOString(),
      tags: Array.isArray(articleData.tags) ? articleData.tags : []
    };

    // Store the article in the appropriate table
    if (storeInFoodArticles) {
      await storeFoodArticle(
        article.title,
        article.content,
        'Food & Cooking',
        article.tags,
        {
          summary: article.summary,
          imageUrl: article.imageUrl,
          readTime: article.readTime,
          publishedAt: article.publishedAt
        }
      );
    } else {
      await storeArticle(
        article.content,
        {
          title: article.title,
          summary: article.summary,
          imageUrl: article.imageUrl,
          readTime: article.readTime,
          publishedAt: article.publishedAt,
          tags: article.tags
        }
      );
    }

    console.log(`[ArticleService] Article stored in ${storeInFoodArticles ? 'food_articles' : 'articles'} table: "${article.title}"`);
    return article;

  } catch (error) {
    console.error(`[ArticleService] Error generating/storing article for topic "${topic}":`, error);
    throw error;
  }
}

/**
 * Generates a single random food-related article using the XAI API.
 */
export async function generateArticle(): Promise<Article> {
  const apiKey = getXaiApiKey();
  if (!apiKey) {
    throw new ArticleGenerationError('API key is required for article generation');
  }

  try {
    // First, generate a random food concept/title
    await enforceRateLimit();
    console.log('[ArticleService] Starting random topic generation');
    const topicResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [
          {
            role: "user",
            content: 'Generate a unique and appetizing food recipe title or concept. Be creative and unexpected, avoiding common combinations. Include specific ingredients, techniques, or cuisines. For example: "Cardamom Rose Panna Cotta with Saffron Honey", "Smoky Jackfruit Street Tacos with Pineapple Salsa", "Tahini-Miso Glazed Eggplant with Crispy Garlic Chips". Respond with only the title or concept text, nothing else.'
          }
        ]
      })
    });

    if (!topicResponse.ok) {
      const errorData = await topicResponse.json().catch(() => ({}));
      throw new ArticleGenerationError(
        `Random topic generation failed with status: ${topicResponse.status}`,
        errorData
      );
    }

    const topicData = await topicResponse.json();
    const generatedTopic = topicData.choices[0].message.content.trim();
    console.log('[ArticleService] Generated random topic:', generatedTopic);

    // Now generate the article using the internal function
    const article = await _generateArticleForTopic(generatedTopic);
    
    // Store the article in Supabase
    await storeFoodArticle(
      article.title,
      article.content,
      'General',
      article.tags,
      {
        imageUrl: article.imageUrl,
        summary: article.summary,
        readTime: article.readTime,
        publishedAt: article.publishedAt
      }
    );

    return article;
  } catch (error) {
    console.error('Error in article generation:', error);
    throw error;
  }
}

/**
 * Generates an article for a specific provided topic.
 */
export async function generateArticleFromTopic(topic: string): Promise<Article> {
  return await _generateArticleForTopic(topic);
}

/**
 * Generates multiple random food-related articles with optimized concurrent requests.
 * Saves successful results to cache.
 */
export async function generateArticles(
  count: number = 5,
  onArticleGenerated: (article: Article) => void,
  onArticleError?: (error: any, index: number) => void,
  onComplete?: () => void,
): Promise<void> {
  console.log(`[ArticleService] Starting generation of ${count} random articles.`);
  const startTime = Date.now();

  console.log('[ArticleService] Generating new random articles...');
  const allGeneratedArticles: Article[] = []; 
  const usedTopics = new Set<string>();
  const maxRetries = 5;
  const concurrentLimit = 2; 
  const maxDuplicateTopics = 8;
  
  let activePromises = 0;
  const promises: Promise<void>[] = [];

  const generateSingleArticleWithRetry = async (index: number): Promise<void> => {
    let attempt = 0;
    let duplicateCount = 0;
    while (attempt < maxRetries) {
      try {
        const article = await generateArticle(); 

        const normalizedTitle = article.title.toLowerCase().trim();
        if (!usedTopics.has(normalizedTitle)) {
            usedTopics.add(normalizedTitle);
            allGeneratedArticles[index] = article; 
            onArticleGenerated(article); 
            return; 
        }
        
        duplicateCount++;
        console.log(`[ArticleService] Duplicate random article title detected (attempt ${attempt + 1}), retrying...`);
        
        if (duplicateCount >= maxDuplicateTopics) {
          console.warn('[ArticleService] Too many duplicate random titles, modifying title');
          const randomId = Math.floor(Math.random() * 1000);
          article.title = `${article.title} - Var ${randomId}`;
          if (!usedTopics.has(article.title.toLowerCase().trim())) {
            usedTopics.add(article.title.toLowerCase().trim());
            allGeneratedArticles[index] = article; 
            onArticleGenerated(article);
            return; 
          }
        }
        
        attempt++;
        await sleep(500 * attempt);

      } catch (error) {
        console.error(`[ArticleService] Attempt ${attempt + 1} for random article index ${index} failed:`, error);
        attempt++;
        if (attempt === maxRetries) {
          if (onArticleError) onArticleError(error, index);
          return;
        }
        await sleep(1000 * attempt);
      }
    }
    const finalError = new ArticleGenerationError(`Failed to generate unique random article for index ${index} after max retries`);
    if (onArticleError) onArticleError(finalError, index);
  };

  // Manage concurrency
  const articleIndices = Array.from({ length: count }, (_, i) => i);
  let currentIndex = 0;

  const runNext = async () => {
    if (currentIndex >= count) return;
    const indexToProcess = articleIndices[currentIndex++];
    activePromises++;
    const promise = generateSingleArticleWithRetry(indexToProcess).finally(() => {
        activePromises--;
        runNext();
    });
    promises.push(promise);
    if (activePromises < concurrentLimit) runNext();
  };

  for (let i = 0; i < Math.min(concurrentLimit, count); i++) runNext();
  await Promise.all(promises);

  // Cache successful results
  const successfulArticles = allGeneratedArticles.filter(Boolean);
  if (successfulArticles.length > 0) {
      setCachedData<Article>(CACHE_KEY_INDEX_ARTICLES, successfulArticles);
  } else {
      console.warn("[ArticleService] No successful random articles generated, cache not updated.");
  }

  const duration = Date.now() - startTime;
  console.log(`[ArticleService] Random article generation attempts completed in ${duration}ms.`);
  if (onComplete) onComplete();
}

/**
 * Generates articles for a list of specified topics with optimized concurrent requests.
 * Saves successful results to cache.
 */
export async function generateArticlesFromTopics(
  topics: string[],
  onArticleGenerated: (article: Article, index: number) => void,
  onError: (error: Error, index: number, topic: string) => void,
  onComplete: () => void,
  storeInFoodArticles: boolean = false
): Promise<void> {
  const articles: (Article | null)[] = new Array(topics.length).fill(null);
  let completedCount = 0;

  await Promise.all(
    topics.map(async (topic, index) => {
      try {
        const article = await _generateArticleForTopic(topic, storeInFoodArticles);
        articles[index] = article;
        onArticleGenerated(article, index);
      } catch (error) {
        console.error(`Error generating article for topic "${topic}":`, error);
        onError(error as Error, index, topic);
      } finally {
        completedCount++;
        if (completedCount === topics.length) {
          onComplete();
        }
      }
    })
  );
} 