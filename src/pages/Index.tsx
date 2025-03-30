import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, ArrowLeft, Upload, AlertCircle, BookOpen, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import CameraComponent from '@/components/Camera';
import RecipeCard from '@/components/RecipeCard';
import ArticleCard from '@/components/ArticleCard';
import LoadingState from '@/components/LoadingState';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import type { Recipe } from '@/components/RecipeCard';
import { Article } from '@/types/article';
import { generateArticle } from '@/utils/articleService';
import { getPopularRecipes, deleteAllPopularRecipes } from '@/lib/recipes';
import { getRecentFoodArticles, deleteAllFoodArticles } from '@/lib/foodArticles';
import { testSupabaseConnection } from '@/lib/supabase';
import { generateRecipes } from '@/utils/recipeService';
import { generateArticlesFromTopics } from '@/utils/articleService';

/**
 * Helper function to clean any markdown formatting that might have slipped through
 * but preserve special markers like our section headers
 */
const cleanFormatting = (text: string): string => {
  if (!text) return '';
  
  // Don't modify our special markers for headers
  if (text.startsWith('##HEADER## ')) {
    const headerContent = text.substring('##HEADER## '.length);
    return '##HEADER## ' + headerContent
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s+/gm, '')
      .replace(/__/g, '')
      .replace(/_/g, '')
      .trim();
  }
  
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .trim();
};

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

const Index = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    photo,
    isCapturingPhoto,
    isProcessing,
    startCapture,
    cancelCapture,
    submitPhoto,
    handleFileUpload,
    reset,
    error: photoError,
    recipeData
  } = usePhotoCapture();
  
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>([]);
  const [isLoadingPopularRecipes, setIsLoadingPopularRecipes] = useState(true);
  const [popularRecipesError, setPopularRecipesError] = useState<string | null>(null);
  
  const [localArticles, setLocalArticles] = useState<Article[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  
  const fetchPopularRecipes = async (forceRefresh = false) => {
    setIsLoadingPopularRecipes(true);
    setPopularRecipesError(null);

    try {
      if (!forceRefresh) {
        // Try to get existing recipes first
        const recipes = await getPopularRecipes(4);
        if (recipes.length > 0) {
          setLocalRecipes(recipes);
          setIsLoadingPopularRecipes(false);
          return;
        }
      }

      // If forceRefresh, delete all existing recipes first
      if (forceRefresh) {
        await deleteAllPopularRecipes();
      }

      // Clear existing recipes before generating new ones
      setLocalRecipes([]);

      // Generate new recipes
      await generateRecipes(
        4,
        (recipe) => {
          setLocalRecipes(prev => [...prev, recipe]);
        },
        (error, index) => {
          console.error('Error generating recipe:', error);
          setPopularRecipesError(prev => prev ? `${prev}; Recipe ${index + 1} Failed` : `Recipe ${index + 1} Failed`);
        },
        () => {
          setIsLoadingPopularRecipes(false);
        }
      );
    } catch (error) {
      console.error('Error fetching/generating popular recipes:', error);
      setPopularRecipesError('Failed to load popular recipes');
      setIsLoadingPopularRecipes(false);
    }
  };

  const fetchArticles = async (forceRefresh = false) => {
    setIsLoadingArticles(true);
    setArticlesError(null);

    try {
      // First try to get existing articles from Supabase
      const articles = await getRecentFoodArticles(5);
      
      // If we have articles and don't need to refresh, just display them
      if (!forceRefresh && articles.length > 0) {
        setLocalArticles(articles.map(convertFoodArticleToArticle));
        setIsLoadingArticles(false);
        return;
      }

      // If forceRefresh or no articles exist, generate new ones
      if (forceRefresh) {
        await deleteAllFoodArticles();
      }
      setLocalArticles([]);

      // Generate and store new articles using predefined topics
      const topics = [
        "Essential Knife Skills Every Home Cook Should Master",
        "Understanding Different Cooking Oils and Their Uses",
        "The Art of Balancing Flavors in Cooking",
        "Meal Prep Strategies for Busy Professionals",
        "Sustainable Cooking: Reducing Food Waste"
      ];

      await generateArticlesFromTopics(
        topics,
        (article) => {
          setLocalArticles(prev => [...prev, article]);
        },
        (error, index, topic) => {
          console.error(`Error generating article for "${topic}":`, error);
          setArticlesError(prev => prev ? `${prev}; Article ${index + 1} Failed` : `Article ${index + 1} Failed`);
        },
        () => {
          setIsLoadingArticles(false);
        },
        true // Store in food_articles table
      );
    } catch (error) {
      console.error('Error fetching/generating articles:', error);
      setArticlesError('Failed to load articles');
      setIsLoadingArticles(false);
    }
  };

  useEffect(() => {
    // Test Supabase connection
    testSupabaseConnection().then(isConnected => {
      if (!isConnected) {
        console.error('Failed to connect to Supabase');
      }
    });

    fetchPopularRecipes(false);
    fetchArticles(false);
  }, []);
  
  useEffect(() => {
    if (recipeData && !isProcessing) {
      try {
        const { recipe } = recipeData;
        console.log("Creating recipe card with data:", {
          title: recipe.title,
          ingredients: recipe.ingredients?.length || 0,
          instructions: recipe.instructions?.length || 0
        });
        const safeRecipe: Recipe = {
          id: Date.now().toString(),
          title: cleanFormatting(recipe.title) || "Homemade Dish",
          description: cleanFormatting(recipe.description) || "A delicious homemade recipe.",
          ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 
            ? recipe.ingredients.map(cleanFormatting)
            : ["Ingredients could not be detected. Please try again with a clearer image."],
          instructions: Array.isArray(recipe.instructions) && recipe.instructions.length > 0
            ? recipe.instructions
            : ["Instructions could not be detected. Please try again with a clearer image."],
          cookTime: cleanFormatting(recipe.cookTime) || "30 mins",
          servings: recipe.servings || 4,
          imageUrl: photo || 'https://via.placeholder.com/400',
          tags: Array.isArray(recipe.tags) ? recipe.tags.map(cleanFormatting) : []
        };
        setGeneratedRecipe(safeRecipe);
      } catch (err) {
        console.error("Error creating recipe from API response:", err);
      }
    }
  }, [recipeData, isProcessing, photo]);
  
  const handleNewRecipe = () => {
    reset();
    setGeneratedRecipe(null);
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = '';
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />
      
      <Header 
        transparent={isCapturingPhoto}
        leftAction={generatedRecipe && (
          <Button 
            variant="ghost" 
            icon={<ArrowLeft size={18} />}
            onClick={handleNewRecipe}
          >
            Back
          </Button>
        )}
      />
      
      <main className="flex-1 pt-16">
        {!isCapturingPhoto && !photo && !generatedRecipe && (
          <div className="max-w-screen-md mx-auto px-4 py-8">
            <div className="text-center mb-12 mt-8">
              <h1 className="text-3xl md:text-4xl font-display mb-4 animate-fade-in">
                Turn food photos into recipes
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto animate-slide-up">
                Upload a picture of any dish and instantly get a recipe with ingredients and instructions.
              </p>
            </div>
            
            <div className="flex justify-center gap-4 mb-12 animate-slide-up animation-delay-200">
              <Button 
                size="lg"
                onClick={triggerFileInput}
                icon={<Upload size={20} />}
                className="shadow-lg"
              >
                Upload Photo
              </Button>
              
              <Button 
                size="lg"
                onClick={startCapture}
                icon={<Camera size={20} />}
                className="shadow-lg"
                variant="outline"
              >
                Use Camera
              </Button>
            </div>
            
            {photoError && (
              <div className="text-center mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center text-destructive">
                <AlertCircle size={20} className="mr-3 flex-shrink-0" />
                <p>{photoError}</p>
              </div>
            )}
            
            <div className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-display tracking-tight">Popular Recipes</h2>
                <Button 
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={16} />}
                  onClick={() => fetchPopularRecipes(true)}
                  disabled={isLoadingPopularRecipes}
                >
                  {isLoadingPopularRecipes ? 'Refreshing...' : 'Refresh Recipes'}
                </Button>
              </div>

              {isLoadingPopularRecipes && localRecipes.length === 0 && (
                <LoadingState text="Loading popular recipes..." />
              )}
              {!isLoadingPopularRecipes && popularRecipesError && localRecipes.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <p>Error loading popular recipes: {popularRecipesError}</p>
                </div>
              )}
              {localRecipes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {localRecipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} className="animate-fade-in" />
                  ))}
                  {isLoadingPopularRecipes && Array.from({ length: Math.max(0, 4 - localRecipes.length) }).map((_, idx) => (
                    <div key={`recipe-placeholder-${idx}`} className="floating-card bg-muted/50 animate-pulse h-[500px] rounded-xl"></div>
                  ))}
                </div>
              )}
              {!isLoadingPopularRecipes && !popularRecipesError && localRecipes.length === 0 && (
                <p className="text-center text-muted-foreground">No popular recipes available at the moment.</p>
              )}
            </div>

            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display">Food & Cooking Articles</h2>
                <Button 
                  variant="outline"
                  size="sm"
                  icon={<RefreshCw size={16} />}
                  onClick={() => fetchArticles(true)}
                  disabled={isLoadingArticles}
                >
                  {isLoadingArticles ? 'Refreshing...' : 'Refresh Articles'}
                </Button>
              </div>

              {isLoadingArticles && localArticles.length === 0 && (
                <LoadingState text="Loading articles..." />
              )}
              {!isLoadingArticles && articlesError && localArticles.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <p>Error loading articles: {articlesError}</p>
                </div>
              )}
              {localArticles.length > 0 && (
                <div className="space-y-6">
                  {localArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} className="animate-fade-in" />
                  ))}
                  {isLoadingArticles && Array.from({ length: Math.max(0, 5 - localArticles.length) }).map((_, idx) => (
                    <div key={`article-placeholder-${idx}`} className="floating-card bg-muted/50 animate-pulse h-[150px] rounded-xl"></div>
                  ))}
                </div>
              )}
              {!isLoadingArticles && !articlesError && localArticles.length === 0 && (
                <p className="text-center text-muted-foreground">No articles available at the moment.</p>
              )}
            </div>
          </div>
        )}
        
        {isCapturingPhoto && (
          <div className="absolute inset-0 z-40 bg-background">
            <CameraComponent
              onCapture={submitPhoto}
              onClose={cancelCapture}
            />
          </div>
        )}
        
        {photo && isProcessing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background">
            <LoadingState />
          </div>
        )}
        
        {generatedRecipe && !isProcessing && (
          <RecipeCard 
            recipe={generatedRecipe} 
            isFullView={true}
          />
        )}
      </main>
    </div>
  );
};

export default Index;


