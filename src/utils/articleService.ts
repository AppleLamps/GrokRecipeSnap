import { getXaiApiKey } from '@/utils/env';

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

/**
 * Generates a food-related article using the XAI API
 * @param topic Optional specific topic to write about
 * @returns Promise with the generated article
 */
export async function generateArticle(topic?: string): Promise<Article> {
  const apiKey = getXaiApiKey();
  
  if (!apiKey) {
    throw new Error('API key is required for article generation');
  }

  const systemPrompt = `You are a professional food writer and culinary expert who creates engaging, informative articles about food, cooking, and recipes.

Write articles that are:
1. Informative and educational
2. Engaging and conversational in tone
3. Well-structured with clear sections
4. Include practical tips and insights
5. 400-600 words in length

Return ONLY a valid JSON object with this exact structure (no markdown, no backticks):
{
  "title": "Engaging title for the article",
  "summary": "Brief 1-2 sentence summary",
  "content": "The full article content with proper paragraph breaks",
  "tags": ["relevant", "topic", "tags"],
  "readTime": "X min read"
}`;

  const userPrompt = topic 
    ? `Write an article about: ${topic}`
    : 'Write an engaging article about a trending food topic, cooking technique, or culinary tradition.';

  try {
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
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Article generation failed with status: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean up the response by removing any markdown formatting or backticks
    content = content
      .replace(/```json\s*/, '')  // Remove ```json
      .replace(/```\s*$/, '')     // Remove closing ```
      .replace(/\n/g, ' ')        // Replace newlines with spaces
      .trim();                    // Remove extra whitespace
    
    // Parse the cleaned JSON
    const articleData = JSON.parse(content);

    // Generate a placeholder image URL based on the title
    const imageUrl = `https://source.unsplash.com/800x400/?${encodeURIComponent(articleData.title.split(' ').slice(0, 2).join(' '))}`;

    return {
      id: `article-${Date.now()}`,
      title: articleData.title,
      content: articleData.content,
      summary: articleData.summary,
      imageUrl,
      readTime: articleData.readTime,
      publishedAt: new Date().toISOString(),
      tags: articleData.tags
    };
  } catch (error) {
    console.error('Error generating article:', error);
    throw error;
  }
}

/**
 * Generates multiple food-related articles
 * @param count Number of articles to generate
 * @returns Promise with an array of generated articles
 */
export async function generateArticles(count: number = 3): Promise<Article[]> {
  const topics = [
    'Seasonal cooking tips',
    'Essential kitchen techniques',
    'Global food traditions',
    'Sustainable cooking practices',
    'Food and wellness',
    'Kitchen organization tips',
    'Food science basics',
    'Meal planning strategies'
  ];

  // Generate articles in parallel
  const articlePromises = Array(count)
    .fill(null)
    .map(() => {
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      return generateArticle(randomTopic);
    });

  return Promise.all(articlePromises);
} 