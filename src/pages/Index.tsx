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

        // Process instructions to remove metadata lines
        let processedInstructions = [];
        if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
          // Filter out any standalone metadata lines like "Servings: 4"
          processedInstructions = recipe.instructions.filter(instruction => {
            const trimmed = instruction.trim();
            // Skip instructions that are just metadata
            if (/^(Servings|Cooking Time|Difficulty):?\s+\w+$/i.test(trimmed)) {
              return false;
            }
            return true;
          }).map(cleanFormatting);
        } else {
          processedInstructions = ["No instructions detected. Try uploading a clearer image of the dish."];
        }

        const safeRecipe: Recipe = {
          id: Date.now().toString(),
          title: cleanFormatting(recipe.title) || "Homemade Dish",
          description: cleanFormatting(recipe.description) || "A delicious homemade recipe.",
          ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
            ? recipe.ingredients.map(cleanFormatting)
            : ["No ingredients detected. Try uploading a clearer image or a different angle of the dish."],
          instructions: processedInstructions,
          cookTime: cleanFormatting(recipe.cookTime) || "30 mins",
          servings: recipe.servings || 4,
          imageUrl: photo || 'https://via.placeholder.com/400',
          tags: Array.isArray(recipe.tags) ? recipe.tags.map(cleanFormatting) : [],
          macros: recipe.macros ? {
            calories: Number(recipe.macros.calories) || 0,
            protein: Number(recipe.macros.protein) || 0,
            carbs: Number(recipe.macros.carbs) || 0,
            fat: Number(recipe.macros.fat) || 0,
            fiber: recipe.macros.fiber ? Number(recipe.macros.fiber) : undefined,
            sugar: recipe.macros.sugar ? Number(recipe.macros.sugar) : undefined,
            sodium: recipe.macros.sodium ? Number(recipe.macros.sodium) : undefined
          } : undefined
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
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
              <div className="text-left max-w-xl">
                <h1 className="text-4xl md:text-5xl font-display mb-4 animate-fade-in leading-tight">
                  <span className="text-primary">Snap</span> a photo, <br />
                  <span className="text-primary">Get</span> a recipe
                </h1>
                <p className="text-muted-foreground text-lg mb-8 animate-slide-up">
                  Upload a picture of any dish and instantly get a detailed recipe with ingredients and step-by-step instructions. No more guessing what's in that delicious meal!
                </p>

                <div className="flex flex-wrap gap-4 mb-8 animate-slide-up animation-delay-200">
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
              </div>

              {/* Hero Image */}
              <div className="relative w-full max-w-md">
                <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl border border-border/50">
                  <img
                    src="/hero-image.jpg"
                    alt="Food dish with recipe"
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary/10 rounded-full blur-2xl z-0"></div>
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-accent/10 rounded-full blur-xl z-0"></div>
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-display mb-8 text-center">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Camera size={24} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-display mb-2">1. Snap or Upload</h3>
                  <p className="text-muted-foreground">Take a photo of any dish or upload an existing image from your gallery.</p>
                </div>

                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M12 8v-2"/><path d="M12 18v-2"/><path d="M8 12H6"/><path d="M18 12h-2"/></svg>
                  </div>
                  <h3 className="text-xl font-display mb-2">2. AI Analysis</h3>
                  <p className="text-muted-foreground">Our AI instantly analyzes the image to identify ingredients and cooking methods.</p>
                </div>

                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                  </div>
                  <h3 className="text-xl font-display mb-2">3. Get Recipe</h3>
                  <p className="text-muted-foreground">Receive a complete recipe with ingredients list and step-by-step instructions.</p>
                </div>
              </div>
            </div>

            {/* Expert Chat Section */}
            <div className="bg-secondary/30 rounded-2xl p-8 mb-16 flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2">
                <h2 className="text-2xl md:text-3xl font-display mb-4">Need Cooking Help?</h2>
                <p className="text-muted-foreground mb-6">
                  Have questions about a recipe or need cooking advice? Our AI Culinary Expert is here to help with ingredient substitutions, cooking techniques, and more.
                </p>
                <Button
                  size="lg"
                  onClick={openExpertChat}
                  icon={<MessageSquare size={20} />}
                  variant="primary"
                  className="shadow-lg"
                >
                  Chat with Culinary Expert
                </Button>
              </div>
              <div className="w-full md:w-1/2 bg-background rounded-xl p-4 shadow-md border border-border/50">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm">
                    How do I know when my steak is medium-rare?
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-sm border border-border/50">
                    For medium-rare steak, the internal temperature should reach 130-135°F (54-57°C). If you don't have a meat thermometer, press the center with tongs - it should feel like the base of your thumb when touching your middle finger.
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonials/Benefits */}
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-display mb-8 text-center">Why Users Love RecipeSnap</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M6 12h12"/><path d="M12 6v12"/></svg>
                  </div>
                  <h3 className="font-display mb-2">Save Time</h3>
                  <p className="text-muted-foreground text-sm">Get recipes instantly without searching through cookbooks or websites.</p>
                </div>

                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>
                  </div>
                  <h3 className="font-display mb-2">Recreate Any Dish</h3>
                  <p className="text-muted-foreground text-sm">Loved a restaurant meal? Snap a photo and make it at home.</p>
                </div>

                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  </div>
                  <h3 className="font-display mb-2">Expert Guidance</h3>
                  <p className="text-muted-foreground text-sm">Get cooking tips and advice from our AI culinary expert.</p>
                </div>

                <div className="bg-background rounded-xl p-6 border border-border/50 shadow-sm text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 8v.01"/><path d="M17 8v.01"/><path d="M12 8v.01"/><path d="M7 4v.01"/><path d="M17 4v.01"/><path d="M12 4v.01"/></svg>
                  </div>
                  <h3 className="font-display mb-2">Expand Your Skills</h3>
                  <p className="text-muted-foreground text-sm">Learn new recipes and cooking techniques to improve your culinary skills.</p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center bg-primary/5 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl md:text-3xl font-display mb-4">Ready to Transform Your Cooking?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-6">
                Start by uploading a photo of your favorite dish and get cooking with a detailed recipe in seconds.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
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
            </div>

            {/* Footer */}
            <footer className="text-center text-muted-foreground text-sm border-t border-border/50 pt-8">
              <p>© {new Date().getFullYear()} RecipeSnap. All rights reserved.</p>
              <p className="mt-2">Powered by AI to help you cook better meals.</p>
            </footer>

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


