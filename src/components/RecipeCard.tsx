
import React, { useState } from 'react';
import { Clock, Users, BookOpen, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tags?: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
  isFullView?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  className,
  isFullView = false
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  
  const toggleSave = () => {
    setIsSaved(!isSaved);
    
    // In a real app, you would save this to local storage or a database
    console.log(isSaved ? 'Recipe unsaved' : 'Recipe saved');
  };
  
  // Compact card view
  if (!isFullView) {
    return (
      <div className={cn(
        "floating-card overflow-hidden group",
        className
      )}>
        <div className="aspect-square overflow-hidden rounded-xl -mt-2 -mx-2 mb-3">
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-display text-lg leading-tight">{recipe.title}</h3>
            <button 
              onClick={toggleSave}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {recipe.description}
          </p>
          
          <div className="flex items-center pt-1 text-xs text-muted-foreground">
            <Clock size={14} className="mr-1" />
            <span className="mr-3">{recipe.cookTime}</span>
            <Users size={14} className="mr-1" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Full view
  return (
    <div className={cn(
      "flex flex-col w-full animate-fade-in",
      className
    )}>
      {/* Hero section */}
      <div className="relative h-72 sm:h-96 overflow-hidden bg-black">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title}
          className="w-full h-full object-cover opacity-90"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display text-white mb-2 drop-shadow-sm">
            {recipe.title}
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl drop-shadow-sm">
            {recipe.description}
          </p>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center text-white text-xs">
              <Clock size={14} className="mr-1.5" />
              {recipe.cookTime}
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center text-white text-xs">
              <Users size={14} className="mr-1.5" />
              {recipe.servings} servings
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 sm:px-6 py-6 flex-1 max-w-3xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={cn(
              "pb-2 px-4 text-sm font-medium transition-colors",
              activeTab === 'ingredients'
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab('ingredients')}
          >
            Ingredients
          </button>
          
          <button
            className={cn(
              "pb-2 px-4 text-sm font-medium transition-colors",
              activeTab === 'instructions'
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab('instructions')}
          >
            Instructions
          </button>
        </div>
        
        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === 'ingredients' ? (
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start pb-2">
                  <span className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="ml-3">{ingredient}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="space-y-6">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-secondary-foreground font-medium text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p>{instruction}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        
        {/* Action button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={toggleSave}
            icon={isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            variant={isSaved ? "secondary" : "primary"}
          >
            {isSaved ? "Saved" : "Save Recipe"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
