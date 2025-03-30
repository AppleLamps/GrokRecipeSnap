import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, ArrowLeft, Upload, AlertCircle, BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import CameraComponent from '@/components/Camera';
import RecipeCard from '@/components/RecipeCard';
import ArticleCard from '@/components/ArticleCard';
import LoadingState from '@/components/LoadingState';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { sampleRecipes } from '@/utils/mockData';
import { Recipe } from '@/components/RecipeCard';
import { Article, generateArticles } from '@/utils/articleService';

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

const Index = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  
  const {
    photo,
    isCapturingPhoto,
    isProcessing,
    startCapture,
    cancelCapture,
    submitPhoto,
    handleFileUpload,
    reset,
    error,
    recipeData
  } = usePhotoCapture();
  
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  
  // When the API processing is done, convert the API response to a recipe
  useEffect(() => {
    if (recipeData && !isProcessing) {
      try {
        // Convert API response to Recipe format
        const { recipe } = recipeData;
        
        // Log for debugging
        console.log("Creating recipe card with data:", {
          title: recipe.title,
          ingredients: recipe.ingredients?.length || 0,
          instructions: recipe.instructions?.length || 0
        });
        
        // Ensure all required fields have values and clean any remaining formatting
        const safeRecipe: Recipe = {
          id: Date.now().toString(),
          title: cleanFormatting(recipe.title) || "Homemade Dish",
          description: cleanFormatting(recipe.description) || "A delicious homemade recipe.",
          ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 
            ? recipe.ingredients.map(cleanFormatting)
            : ["Ingredients could not be detected. Please try again with a clearer image."],
          instructions: Array.isArray(recipe.instructions) && recipe.instructions.length > 0
            ? recipe.instructions.map(cleanFormatting)
            : ["Instructions could not be detected. Please try again with a clearer image."],
          cookTime: cleanFormatting(recipe.cookTime) || "30 mins",
          servings: recipe.servings || 4,
          imageUrl: photo || 'https://via.placeholder.com/400',
          tags: Array.isArray(recipe.tags) ? recipe.tags.map(cleanFormatting) : []
        };
        
        setGeneratedRecipe(safeRecipe);
      } catch (err) {
        console.error("Error creating recipe from API response:", err);
        // Don't set generatedRecipe if there's an error
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
      // Reset the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Load articles when the component mounts
  useEffect(() => {
    const loadArticles = async () => {
      setIsLoadingArticles(true);
      try {
        const generatedArticles = await generateArticles(3);
        setArticles(generatedArticles);
      } catch (error) {
        console.error('Error loading articles:', error);
      } finally {
        setIsLoadingArticles(false);
      }
    };

    loadArticles();
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hidden file input */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Header */}
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
      
      {/* Main content */}
      <main className="flex-1 pt-16">
        {/* Home screen with upload options */}
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
            
            {error && (
              <div className="text-center mb-6 p-4 bg-red-50 rounded-lg border border-red-100 animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
                  <AlertCircle size={16} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {/* Recipe suggestions */}
            <div className="mt-12">
              <h2 className="text-xl font-display mb-6 px-4">Popular Recipes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {sampleRecipes.map((recipe) => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    className="animate-fade-in" 
                  />
                ))}
              </div>
            </div>

            {/* Food & Cooking Articles */}
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6 px-4">
                <h2 className="text-xl font-display">Food & Cooking Articles</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<BookOpen size={16} />}
                  onClick={() => {
                    setIsLoadingArticles(true);
                    generateArticles(3)
                      .then(newArticles => setArticles(newArticles))
                      .catch(error => console.error('Error refreshing articles:', error))
                      .finally(() => setIsLoadingArticles(false));
                  }}
                >
                  Refresh Articles
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {isLoadingArticles ? (
                  // Loading placeholders
                  Array(3).fill(null).map((_, i) => (
                    <div 
                      key={i} 
                      className="animate-pulse rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="aspect-[1.85/1] bg-secondary" />
                      <div className="p-4 space-y-3">
                        <div className="h-6 bg-secondary rounded w-3/4" />
                        <div className="h-4 bg-secondary rounded w-full" />
                        <div className="h-4 bg-secondary rounded w-2/3" />
                      </div>
                    </div>
                  ))
                ) : (
                  articles.map(article => (
                    <ArticleCard 
                      key={article.id} 
                      article={article}
                      className="animate-fade-in"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Camera capture view */}
        {isCapturingPhoto && (
          <div className="absolute inset-0 z-40 bg-background">
            <CameraComponent
              onCapture={submitPhoto}
              onClose={cancelCapture}
            />
          </div>
        )}
        
        {/* Processing view */}
        {photo && isProcessing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background">
            <LoadingState />
          </div>
        )}
        
        {/* Error while displaying recipe */}
        {photo && !isProcessing && error && !generatedRecipe && (
          <div className="max-w-screen-md mx-auto p-6 text-center">
            <div className="bg-red-50 rounded-xl p-6 mb-6 border border-red-100">
              <div className="text-red-600 mb-4">
                <AlertCircle size={40} className="mx-auto mb-2" />
                <h3 className="text-lg font-medium">Recipe Generation Failed</h3>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <Button 
                onClick={handleNewRecipe}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
            
            {photo && (
              <div className="mt-6">
                <h4 className="text-sm text-muted-foreground mb-2">Uploaded Image</h4>
                <div className="rounded-lg overflow-hidden max-w-xs mx-auto">
                  <img 
                    src={photo} 
                    alt="Uploaded food" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Generated recipe view */}
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
