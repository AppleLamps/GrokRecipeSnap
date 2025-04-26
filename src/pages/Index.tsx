import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, ArrowLeft, Upload, AlertCircle, MessageSquare } from 'lucide-react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import CameraComponent from '@/components/Camera';
import RecipeCard from '@/components/RecipeCard';
import LoadingState from '@/components/LoadingState';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import type { Recipe } from '@/components/RecipeCard';
import { testSupabaseConnection } from '@/lib/supabase';
import CulinaryExpertChat from '@/components/CulinaryExpertChat';

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
  const [isExpertChatOpen, setIsExpertChatOpen] = useState(false);

  useEffect(() => {
    // Test Supabase connection
    testSupabaseConnection().then(isConnected => {
      if (!isConnected) {
        console.error('Failed to connect to Supabase');
      }
    });
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

  const openExpertChat = () => setIsExpertChatOpen(true);
  const closeExpertChat = () => setIsExpertChatOpen(false);

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

            <div className="flex flex-wrap justify-center gap-4 mb-12 animate-slide-up animation-delay-200">
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

              <Button
                size="lg"
                onClick={openExpertChat}
                icon={<MessageSquare size={20} />}
                className="shadow-lg"
                variant="secondary"
              >
                Chat with Culinary Expert
              </Button>
            </div>

            {photoError && (
              <div className="text-center mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center text-destructive">
                <AlertCircle size={20} className="mr-3 flex-shrink-0" />
                <p>{photoError}</p>
              </div>
            )}
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

        <CulinaryExpertChat
          isOpen={isExpertChatOpen}
          onClose={closeExpertChat}
        />
      </main>
    </div>
  );
};

export default Index;


