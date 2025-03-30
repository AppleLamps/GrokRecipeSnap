import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ArticleCard from '@/components/ArticleCard';
import LoadingState from '@/components/LoadingState';
import Button from '@/components/Button';
import { getRecentArticles, deleteAllArticles } from '@/lib/articles';
import { Article } from '@/types/article';
import { generateArticlesFromTopics } from '@/utils/articleService';
import { generateDynamicCookingTopics } from '@/utils/topicGenerator';
import { BookOpen, RefreshCw } from 'lucide-react';

const convertFoodArticleToArticle = (foodArticle: any): Article => ({
  id: foodArticle.id,
  title: foodArticle.title,
  content: foodArticle.content,
  summary: foodArticle.metadata?.summary || foodArticle.content.substring(0, 150) + '...',
  imageUrl: foodArticle.metadata?.imageUrl || 'https://source.unsplash.com/800x400/?cooking',
  readTime: foodArticle.metadata?.readTime || '5 min read',
  publishedAt: foodArticle.created_at,
  tags: foodArticle.tags || [],
  metadata: foodArticle.metadata
});

const ArticlesPage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<boolean[]>([]);

  const fetchArticles = async (forceRefresh = false) => {
    console.log(`ArticlesPage: Fetching articles. Force refresh: ${forceRefresh}`);
    setIsLoading(true);
    setError(null);

    try {
      // First try to get existing articles from Supabase
      const existingArticles = await getRecentArticles(9);
      
      if (!forceRefresh && existingArticles.length === 9) {
        setArticles(existingArticles.map(convertFoodArticleToArticle));
        setIsLoading(false);
        setLoadingStates(Array(9).fill(false));
        return;
      }

      // If we need to refresh or don't have enough articles, delete existing ones
      if (forceRefresh) {
        await deleteAllArticles();
      }

      // Generate new articles with dynamic topics
      const dynamicTopics = generateDynamicCookingTopics(9);
      setLoadingStates(Array(dynamicTopics.length).fill(true));
      setArticles([]);

      await generateArticlesFromTopics(
        dynamicTopics.map(topic => topic.title),
        (article) => {
          setArticles(prev => [...prev, article]);
          setLoadingStates(prev => {
            const newStates = [...prev];
            const index = articles.length;
            if (index < newStates.length) {
              newStates[index] = false;
            }
            return newStates;
          });
        },
        (error, index, topic) => {
          console.error(`Error generating article for "${topic}":`, error);
          setError(prev => prev ? `${prev}; Article ${index + 1} Failed` : `Article ${index + 1} Failed`);
          setLoadingStates(prev => {
            const newStates = [...prev];
            if (index < newStates.length) {
              newStates[index] = false;
            }
            return newStates;
          });
        },
        () => {
          setIsLoading(false);
        },
        false // Store in articles table instead of food_articles table
      );
    } catch (error) {
      console.error('Error fetching/generating articles:', error);
      setError('Failed to load articles');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display text-foreground">
            Explore Cooking Articles & Tips
          </h1>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} />}
            onClick={() => fetchArticles(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Refresh Articles'}
          </Button>
        </div>

        {/* Initial overall loading state (only if no articles loaded yet) */}
        {isLoading && articles.length === 0 && !error && (
          <LoadingState text="Generating cooking insights..." />
        )}

        {/* Overall error state if nothing loads */}
        {!isLoading && error && articles.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <p className="mb-2">Failed to load articles.</p>
            <p className="text-sm mb-4">Details: {error}</p>
            <Button onClick={() => fetchArticles(true)} className="mt-4">Try Again</Button>
          </div>
        )}

        {/* Grid of articles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              className="animate-fade-in"
            />
          ))}
          {/* Loading placeholders */}
          {loadingStates.map((isLoading, index) =>
            isLoading && (
              <div
                key={`article-placeholder-${index}`}
                className="floating-card bg-muted/50 animate-pulse h-[300px] rounded-xl"
              />
            )
          )}
        </div>

        {/* Empty state */}
        {!isLoading && !error && articles.length === 0 && (
          <p className="text-center text-muted-foreground">No articles available at the moment.</p>
        )}
      </main>
    </div>
  );
};

export default ArticlesPage; 