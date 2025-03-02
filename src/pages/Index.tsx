
import React, { useState } from 'react';
import { Camera, Plus, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import CameraComponent from '@/components/Camera';
import RecipeCard from '@/components/RecipeCard';
import LoadingState from '@/components/LoadingState';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { sampleRecipes, generateMockAnalysisResult } from '@/utils/mockData';
import { Recipe } from '@/components/RecipeCard';

const Index = () => {
  const {
    photo,
    isCapturingPhoto,
    isProcessing,
    startCapture,
    cancelCapture,
    submitPhoto,
    reset,
  } = usePhotoCapture();
  
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  
  // When the photo processing is done, we'll have a recipe
  React.useEffect(() => {
    if (photo && !isProcessing && !generatedRecipe) {
      const recipe = generateMockAnalysisResult(photo);
      setGeneratedRecipe(recipe);
    }
  }, [photo, isProcessing, generatedRecipe]);
  
  const handleNewRecipe = () => {
    reset();
    setGeneratedRecipe(null);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
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
        {/* Home screen with capture button */}
        {!isCapturingPhoto && !photo && !generatedRecipe && (
          <div className="max-w-screen-md mx-auto px-4 py-8">
            <div className="text-center mb-12 mt-8">
              <h1 className="text-3xl md:text-4xl font-display mb-4 animate-fade-in">
                Turn food photos into recipes
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto animate-slide-up">
                Snap a picture of any dish and instantly get a recipe with ingredients and instructions.
              </p>
            </div>
            
            <div className="flex justify-center mb-12 animate-slide-up animation-delay-200">
              <Button 
                size="lg"
                onClick={startCapture}
                icon={<Camera size={20} />}
                className="shadow-lg"
              >
                Snap a Dish
              </Button>
            </div>
            
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
        
        {/* Generated recipe view */}
        {generatedRecipe && !isProcessing && (
          <RecipeCard 
            recipe={generatedRecipe} 
            isFullView={true}
          />
        )}
      </main>
      
      {/* Floating action button */}
      {generatedRecipe && (
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            onClick={handleNewRecipe}
            icon={<Plus size={18} />}
            className="shadow-lg rounded-full h-14 w-14 p-0"
          >
            <span className="sr-only">New Recipe</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Index;
