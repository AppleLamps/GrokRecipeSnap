import React, { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo
import { Clock, Users, BookOpen, Bookmark, BookmarkCheck, MessageCircle, Send, X, Info, Repeat } from 'lucide-react'; // Added Info, Repeat
import { cn } from '@/lib/utils';
import Button from './Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Label } from "@/components/ui/label"; // Added Label
import { sendMessageToChef } from '@/utils/chatService';

// Helper function to format chef's messages
const formatChefMessage = (content: string) => {
  if (!content) return '';

  // Split into paragraphs
  return content.split('\n\n').map((paragraph, index) => {
    // Handle lists
    if (paragraph.trim().startsWith('- ')) {
      const items = paragraph.split('\n');
      return (
        <ul key={index} className="list-none space-y-2 my-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 mr-2 flex-shrink-0" />
              {formatInlineText(item.replace('- ', ''))}
            </li>
          ))}
        </ul>
      );
    }

    // Handle numbered lists
    if (paragraph.match(/^\d+\./)) {
      const items = paragraph.split('\n');
      return (
        <ol key={index} className="list-none space-y-2 my-3">
          {items.map((item, i) => {
            const numberMatch = item.match(/^(\d+)\.\s*/);
            if (!numberMatch) return null;
            const number = numberMatch[1];
            const text = item.replace(/^\d+\.\s*/, '');
            return (
              <li key={i} className="flex items-start">
                <span className="w-5 flex-shrink-0 font-medium text-primary/80">{number}.</span>
                {formatInlineText(text)}
              </li>
            );
          })}
        </ol>
      );
    }

    // Regular paragraphs
    return (
      <p key={index} className={index > 0 ? 'mt-3' : ''}>
        {formatInlineText(paragraph)}
      </p>
    );
  });
};

// Helper function to format inline text (bold, italic, etc.)
const formatInlineText = (text: string) => {
  // Split the text by bold markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    // Check if this part is bold (surrounded by **)
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturatedFat?: number; // Added from types/recipe.ts update
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

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
  macros?: MacroNutrients;
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
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'nutrition'>('ingredients');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'chef', content: string, id?: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullView, setShowFullView] = useState(isFullView);
  const [showTotalNutrition, setShowTotalNutrition] = useState(false); // State for total nutrition view

  // --- Ref for chat message container ---
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // --------------------------------------

  // --- Add effect to control body scroll ---
  useEffect(() => {
    // Store original body style
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (showFullView) {
      // When full view is shown, prevent body scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // When full view is hidden, restore original style
      document.body.style.overflow = originalStyle;
    }

    // Cleanup function to restore scroll when component unmounts or showFullView changes
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showFullView]); // Re-run effect when showFullView changes
  // -----------------------------------------

  // --- Effect to auto-scroll chat ---
  useEffect(() => {
    if (chatContainerRef.current) {
      // Scroll to the bottom whenever chatMessages changes
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]); // Dependency array includes chatMessages
  // -----------------------------------

  const toggleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsSaved(!isSaved);

    // In a real app, you would save this to local storage or a database
    console.log(isSaved ? 'Recipe unsaved' : 'Recipe saved');
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);

    // If opening chat, make sure it's not collapsed
    if (!isChatOpen) {
      setIsCollapsed(false);

      // If opening chat for the first time, add a welcome message
      if (chatMessages.length === 0) {
        setChatMessages([{
          role: 'chef',
          content: `Hello! I'm your virtual chef assistant for this ${recipe.title} recipe. Feel free to ask me any questions about ingredients, preparation, or cooking techniques!`
        }]);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    // Add user message to chat
    const userMessage = currentMessage;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Create a temporary placeholder for the chef's response
      const tempMessageId = `temp-${Date.now()}`;
      setChatMessages(prev => [...prev, {
        role: 'chef',
        content: '',
        id: tempMessageId
      }]);

      // Use the streaming API to get a response from the AI
      await sendMessageToChef(
        userMessage,
        recipe,
        chatMessages, // Pass the conversation history
        (chunkText, isDone) => {
          // Update the message content with each chunk
          setChatMessages(prev =>
            prev.map(msg =>
              msg.id === tempMessageId
                ? { ...msg, content: chunkText }
                : msg
            )
          );

          // When all chunks are received, remove loading state
          if (isDone) {
            setIsLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => {
        // Filter out the temporary message if it exists
        const withoutTemp = prev.filter(msg => !msg.id);

        // Add the error message
        return [...withoutTemp, {
          role: 'chef',
          content: 'Sorry, I encountered an issue responding to your question. Please try again.'
        }];
      });
      setIsLoading(false);
    }
  };

  // Process instructions to separate headers from steps
  const processedInstructions = React.useMemo(() => {
    // Check if we have a single instruction that contains an error message
    if (recipe.instructions.length === 1 &&
        recipe.instructions[0].includes("could not be detected") ||
        recipe.instructions[0].includes("No instructions detected")) {
      return [{
        originalText: recipe.instructions[0],
        content: recipe.instructions[0],
        isHeader: false,
        hasLeadingNumber: false,
        stepNumber: null,
        isError: true
      }];
    }

    // Filter out any metadata-only instructions like "Servings: 4" that might appear at the beginning
    const filteredInstructions = recipe.instructions.filter(instruction => {
      const trimmed = instruction.trim();
      // Skip instructions that are just metadata
      if (/^(Servings|Cooking Time|Difficulty):?\s+\w+$/i.test(trimmed)) {
        return false;
      }
      return true;
    });

    return filteredInstructions.map(instruction => {
      const trimmedInstruction = instruction.trim();

      // Check if this is a section header (short text ending with colon)
      const isHeader = trimmedInstruction.length < 40 &&
                       trimmedInstruction.endsWith(':') &&
                       !/^\d+[\.\)]/.test(trimmedInstruction); // Not starting with a number

      // Check if instruction already has a number prefix (like "1. Step...")
      const numberMatch = trimmedInstruction.match(/^(\d+)[\.\)]\s+(.+)$/);
      const hasNumber = Boolean(numberMatch);

      // Extract the actual content
      let content = trimmedInstruction;
      let stepNumber = null;

      if (hasNumber && numberMatch) {
        // If numbered, extract the number and content
        stepNumber = parseInt(numberMatch[1], 10);
        content = numberMatch[2].trim();
      }

      // Special handling for "Serve:" instructions - often contains metadata we want to remove
      if (trimmedInstruction.toLowerCase().startsWith('serve:') ||
          (hasNumber && content.toLowerCase().startsWith('serve:')) ||
          (hasNumber && /^serve\b|^serving\b/i.test(content))) {

        // Try to extract just the serving instructions without metadata
        const metadataPattern = /(cooking time|cook time|total time|servings|serves|yield|difficulty):/i;

        // Find the position of the first metadata marker
        const match = content.match(metadataPattern);
        if (match && match.index) {
          // Keep only the content before the first metadata marker
          content = content.substring(0, match.index).trim();
        } else {
          // If no explicit metadata markers, look for other patterns
          // Common pattern: serving instructions followed by "Time:" or similar
          const timePattern = /\b(Time|servings|difficulty)\b/i;
          const timeMatch = content.match(timePattern);

          if (timeMatch && timeMatch.index) {
            // Look for the period or sentence break before this marker
            const contentBeforeTime = content.substring(0, timeMatch.index);
            const periodMatch = contentBeforeTime.match(/\.\s+[A-Z]/);

            if (periodMatch && periodMatch.index) {
              // Keep only up to the end of the previous sentence
              content = contentBeforeTime.substring(0, periodMatch.index + 1).trim();
            } else {
              // If no clear sentence break, just cut at the time marker
              content = contentBeforeTime.trim();
            }
          }

          // Handle case where info about cooking time and servings follows a period
          const metadataAfterPeriod = content.match(/\.\s+(Cooking Time|Cook Time|Servings|Difficulty)/i);
          if (metadataAfterPeriod && metadataAfterPeriod.index) {
            content = content.substring(0, metadataAfterPeriod.index + 1).trim();
          }

          // Special case for patterns like: "Serve... Cooking Time: ... Servings: ... Difficulty: ..."
          if (content.includes("Cooking Time:") || content.includes("Servings:") || content.includes("Difficulty:")) {
            // If we still have these markers, look for the first one and cut there
            const cookingTimeIndex = content.indexOf("Cooking Time:");
            const servingsIndex = content.indexOf("Servings:");
            const difficultyIndex = content.indexOf("Difficulty:");

            const markers = [cookingTimeIndex, servingsIndex, difficultyIndex]
              .filter(index => index !== -1);

            if (markers.length > 0) {
              const firstMarkerIndex = Math.min(...markers);
              content = content.substring(0, firstMarkerIndex).trim();
            }
          }
        }
      }

      return {
        originalText: trimmedInstruction,
        content: content,
        isHeader: isHeader,
        hasLeadingNumber: hasNumber,
        stepNumber: stepNumber,
        isError: false
      };
    });
  }, [recipe.instructions]);

  // Counter for actual steps (excluding headers)
  // let stepCounter = 0; // This seems unused, commenting out for now

  // --- Nutrition Calculations ---
  const nutritionData = useMemo(() => {
    if (!recipe.macros) return null;

    const servings = recipe.servings || 1; // Default to 1 serving if not specified
    const macros = recipe.macros;

    // Reference Daily Values (based on a 2000 kcal diet)
    const dv = {
      calories: 2000,
      totalFat: 78, // g
      saturatedFat: 20, // g
      sodium: 2300, // mg
      carbs: 275, // g
      fiber: 28, // g
      protein: 50, // g
      // Sugar doesn't have an official DV, but we can track it
    };

    const calculateNutrition = (multiplier: number) => {
      const current = {
        calories: (macros.calories || 0) * multiplier,
        protein: (macros.protein || 0) * multiplier,
        carbs: (macros.carbs || 0) * multiplier,
        fat: (macros.fat || 0) * multiplier,
        saturatedFat: (macros.saturatedFat !== undefined ? macros.saturatedFat : null) === null ? null : (macros.saturatedFat || 0) * multiplier,
        fiber: (macros.fiber !== undefined ? macros.fiber : null) === null ? null : (macros.fiber || 0) * multiplier,
        sugar: (macros.sugar !== undefined ? macros.sugar : null) === null ? null : (macros.sugar || 0) * multiplier,
        sodium: (macros.sodium !== undefined ? macros.sodium : null) === null ? null : (macros.sodium || 0) * multiplier,
        netCarbs: (macros.carbs || 0) * multiplier - ((macros.fiber || 0) * multiplier),
      };

      // Calculate %DV only for per-serving view
      const dvPercent = multiplier === 1 ? {
        calories: dv.calories ? Math.round((current.calories / dv.calories) * 100) : null,
        totalFat: dv.totalFat ? Math.round((current.fat / dv.totalFat) * 100) : null,
        saturatedFat: dv.saturatedFat && current.saturatedFat !== null ? Math.round((current.saturatedFat / dv.saturatedFat) * 100) : null,
        sodium: dv.sodium && current.sodium !== null ? Math.round((current.sodium / dv.sodium) * 100) : null,
        carbs: dv.carbs ? Math.round((current.carbs / dv.carbs) * 100) : null,
        fiber: dv.fiber && current.fiber !== null ? Math.round((current.fiber / dv.fiber) * 100) : null,
        protein: dv.protein ? Math.round((current.protein / dv.protein) * 100) : null,
      } : null;

      return { ...current, dvPercent };
    };

    const perServing = calculateNutrition(1);
    const totalRecipe = calculateNutrition(servings);

    // Macronutrient distribution calculation (based on per serving)
    const totalCalories = perServing.calories;
    const proteinCalories = perServing.protein * 4;
    const carbsCalories = perServing.carbs * 4;
    const fatCalories = perServing.fat * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    const distribution = totalMacroCalories > 0 ? {
      protein: Math.round((proteinCalories / totalMacroCalories) * 100),
      carbs: Math.round((carbsCalories / totalMacroCalories) * 100),
      fat: Math.round((fatCalories / totalMacroCalories) * 100),
    } : { protein: 0, carbs: 0, fat: 0 };


    return { perServing, totalRecipe, distribution, servings };

  }, [recipe.macros, recipe.servings]);
  // -----------------------------


  // Compact card view
  if (!showFullView) {
    return (
      <div
        className={cn(
          // Replicate ArticleCard base styling: removed floating-card, added border, rounding, bg
          "group cursor-pointer flex flex-col h-full overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg",
          className
        )}
        onClick={() => setShowFullView(true)}
      >
        {/* Explicit container for the image, no padding, handles top rounding if card is rounded */}
        <div className="overflow-hidden relative">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out" // Keep hover zoom
            loading="lazy"
          />
        </div>

        {/* Text content container - padding remains here */}
        <div className="flex flex-col flex-grow p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg leading-tight line-clamp-2 flex-grow mr-2">{recipe.title}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSave();
              }}
              className="text-muted-foreground hover:text-primary transition-colors ml-auto flex-shrink-0 pt-0.5"
            >
              {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-grow">
            {recipe.description}
          </p>

          <div className="flex items-center gap-3 pt-3 border-t border-border/30 mt-auto">
            <div className="flex items-center text-xs">
              <Clock size={14} className="text-primary/70 mr-1.5" />
              <span>{recipe.cookTime}</span>
            </div>
            <div className="flex items-center text-xs">
              <Users size={14} className="text-primary/70 mr-1.5" />
              <span>{recipe.servings} servings</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto",
      className
    )}>
      <div className="relative max-w-4xl mx-auto pb-12">
        {/* Close button */}
        <button
          onClick={() => setShowFullView(false)}
          className="fixed top-4 right-4 z-50 h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col w-full animate-fade-in">
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

              <button
                className={cn(
                  "pb-2 px-4 text-sm font-medium transition-colors",
                  activeTab === 'nutrition'
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab('nutrition')}
              >
                Nutrition
              </button>
            </div>

            {/* Tab content */}
            <div className="animate-fade-in">
              {activeTab === 'ingredients' ? (
                <div className="space-y-6">
                  {/* Main ingredients list */}
                  {recipe.ingredients.length === 1 && recipe.ingredients[0].includes("could not be detected") ? (
                    <div className="flex items-center justify-center py-8 text-center">
                      <div className="max-w-md">
                        <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        </div>
                        <p className="text-muted-foreground">{recipe.ingredients[0]}</p>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                          <span className="ml-4 leading-relaxed">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Recipe metadata */}
                  <div className="pt-6 mt-6 border-t border-border/50">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Recipe Information</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="w-2 h-2 mt-2 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="ml-4 leading-relaxed">Serving Size: {recipe.servings} portions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 mt-2 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="ml-4 leading-relaxed">Cooking Time: {recipe.cookTime}</span>
                      </li>
                      {recipe.tags && recipe.tags.length > 0 && (
                        <li className="flex items-start">
                          <span className="w-2 h-2 mt-2 rounded-full bg-primary/60 flex-shrink-0" />
                          <span className="ml-4 leading-relaxed">Tags: {recipe.tags.join(', ')}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : activeTab === 'instructions' ? (
                <div className="space-y-8">
                  {processedInstructions.length > 0 && processedInstructions[0].isError ? (
                    <div className="flex items-center justify-center py-8 text-center">
                      <div className="max-w-md">
                        <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        </div>
                        <p className="text-muted-foreground">{processedInstructions[0].content}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {processedInstructions.map((instruction, index) => {
                        if (instruction.isHeader) {
                          return (
                            <h3 key={index} className="font-semibold text-lg mt-8 mb-4 text-foreground">
                              {instruction.originalText}
                            </h3>
                          );
                        } else {
                          const displayNumber = instruction.hasLeadingNumber
                            ? instruction.stepNumber
                            : index + 1 - processedInstructions.slice(0, index).filter(item => item.isHeader).length;

                          return (
                            <div key={index} className="flex group">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-4 mt-0.5 group-hover:bg-primary/10 transition-colors">
                                <span className="text-secondary-foreground group-hover:text-primary font-medium text-sm transition-colors">{displayNumber}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-muted-foreground leading-relaxed">{instruction.content}</p>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </>
                  )}
                </div>
              ) : (
                <TooltipProvider> {/* Added TooltipProvider */}
                  <div className="space-y-6">
                    {/* Nutrition Information */}
                    <div className="bg-secondary/20 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Nutritional Information</h3>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="nutrition-toggle" className="text-xs text-muted-foreground">
                            {showTotalNutrition ? `Total (${nutritionData?.servings || recipe.servings} Servings)` : 'Per Serving'}
                          </Label>
                          <Switch
                            id="nutrition-toggle"
                            checked={showTotalNutrition}
                            onCheckedChange={setShowTotalNutrition}
                            aria-label="Toggle between per serving and total recipe nutrition"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">
                        {showTotalNutrition
                          ? `Values represent the entire recipe (${nutritionData?.servings || recipe.servings} servings).`
                          : `Values per serving. Recipe makes ${nutritionData?.servings || recipe.servings} servings.`}
                        {!showTotalNutrition && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} className="inline-block ml-1 text-muted-foreground/70 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Daily Values (%DV) based on a 2000 calorie diet.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </p>

                      {nutritionData ? (
                        <div className="space-y-6">
                          {/* Use data based on toggle state */}
                          {(() => {
                            const data = showTotalNutrition ? nutritionData.totalRecipe : nutritionData.perServing;
                            const dvPercent = nutritionData.perServing.dvPercent; // %DV always based on per serving

                            return (
                              <>
                                {/* Calories */}
                                <div>
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-sm font-medium">Calories</span>
                                    <div>
                                      <span className="text-sm font-semibold">{Math.round(data.calories)} kcal</span>
                                      {!showTotalNutrition && dvPercent?.calories !== null && (
                                        <span className="text-xs text-muted-foreground ml-1">({dvPercent?.calories}% DV)</span>
                                      )}
                                    </div>
                                  </div>
                                  {!showTotalNutrition && (
                                    <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
                                      <div className="bg-primary h-full" style={{ width: `${Math.min(100, dvPercent?.calories || 0)}%` }}></div>
                                    </div>
                                  )}
                                </div>

                                {/* Macronutrients Table */}
                                <div className="space-y-3 pt-4 border-t border-border/30">
                                  <h4 className="text-sm font-medium mb-2">Macronutrients</h4>
                                  <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                    {/* Headers */}
                                    <div className="font-medium text-muted-foreground">Nutrient</div>
                                    <div className="font-medium text-muted-foreground text-right">Amount</div>
                                    {!showTotalNutrition && <div className="font-medium text-muted-foreground text-right">%DV</div>}
                                    {showTotalNutrition && <div></div>} {/* Placeholder for alignment */}

                                    {/* Protein */}
                                    <div>Protein</div>
                                    <div className="text-right font-medium">{Math.round(data.protein)}g</div>
                                    {!showTotalNutrition && <div className="text-right text-muted-foreground">{dvPercent?.protein !== null ? `${dvPercent?.protein}%` : 'N/A'}</div>}
                                    {showTotalNutrition && <div></div>}

                                    {/* Total Carbs */}
                                    <div>Total Carbs</div>
                                    <div className="text-right font-medium">{Math.round(data.carbs)}g</div>
                                    {!showTotalNutrition && <div className="text-right text-muted-foreground">{dvPercent?.carbs !== null ? `${dvPercent?.carbs}%` : 'N/A'}</div>}
                                    {showTotalNutrition && <div></div>}

                                    {/* Net Carbs */}
                                    {data.fiber !== null && (
                                      <>
                                        <div className="pl-4 text-muted-foreground">Net Carbs
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Info size={12} className="inline-block ml-1 text-muted-foreground/70 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">Total Carbs - Fiber</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                        <div className="text-right font-medium">{Math.round(data.netCarbs)}g</div>
                                        {!showTotalNutrition && <div></div>} {/* No DV for Net Carbs */}
                                        {showTotalNutrition && <div></div>}
                                      </>
                                    )}

                                    {/* Fiber */}
                                    {data.fiber !== null && (
                                      <>
                                        <div className="pl-4 text-muted-foreground">↳ Fiber</div>
                                        <div className="text-right font-medium">{Math.round(data.fiber)}g</div>
                                        {!showTotalNutrition && <div className="text-right text-muted-foreground">{dvPercent?.fiber !== null ? `${dvPercent?.fiber}%` : 'N/A'}</div>}
                                        {showTotalNutrition && <div></div>}
                                      </>
                                    )}

                                    {/* Sugar */}
                                    {data.sugar !== null && (
                                      <>
                                        <div className="pl-4 text-muted-foreground">↳ Sugar</div>
                                        <div className="text-right font-medium">{Math.round(data.sugar)}g</div>
                                        {!showTotalNutrition && <div></div>} {/* No DV for Sugar */}
                                        {showTotalNutrition && <div></div>}
                                      </>
                                    )}

                                    {/* Total Fat */}
                                    <div>Total Fat</div>
                                    <div className="text-right font-medium">{Math.round(data.fat)}g</div>
                                    {!showTotalNutrition && <div className="text-right text-muted-foreground">{dvPercent?.totalFat !== null ? `${dvPercent?.totalFat}%` : 'N/A'}</div>}
                                    {showTotalNutrition && <div></div>}

                                    {/* Saturated Fat */}
                                    {data.saturatedFat !== null && (
                                      <>
                                        <div className="pl-4 text-muted-foreground">↳ Saturated Fat</div>
                                        <div className="text-right font-medium">{Math.round(data.saturatedFat)}g</div>
                                        {!showTotalNutrition && <div className="text-right text-muted-foreground">{dvPercent?.saturatedFat !== null ? `${dvPercent?.saturatedFat}%` : 'N/A'}</div>}
                                        {showTotalNutrition && <div></div>}
                                      </>
                                    )}

                                    {/* Sodium */}
                                    {data.sodium !== null && (
                                      <>
                                        <div>Sodium</div>
                                        <div className="text-right font-medium">{Math.round(data.sodium)}mg</div>
                                        {!showTotalNutrition && <div className="text-right text-muted-foreground">{dvPercent?.sodium !== null ? `${dvPercent?.sodium}%` : 'N/A'}</div>}
                                        {showTotalNutrition && <div></div>}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Macronutrient Distribution (only for per serving) */}
                                {!showTotalNutrition && (
                                  <div className="pt-4 mt-4 border-t border-border/30">
                                    <h4 className="text-sm font-medium mb-3">Caloric Distribution</h4>
                                    <div className="h-3 w-full rounded-full overflow-hidden flex bg-secondary/50">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="bg-blue-500 h-full" style={{ width: `${nutritionData.distribution.protein}%` }}></div>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">Protein: {nutritionData.distribution.protein}%</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="bg-amber-500 h-full" style={{ width: `${nutritionData.distribution.carbs}%` }}></div>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">Carbs: {nutritionData.distribution.carbs}%</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="bg-rose-500 h-full" style={{ width: `${nutritionData.distribution.fat}%` }}></div>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">Fat: {nutritionData.distribution.fat}%</p></TooltipContent>
                                      </Tooltip>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>Protein</span>
                                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>Carbs</span>
                                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>Fat</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          </div>
                          <p className="text-muted-foreground">Nutritional information not available for this recipe.</p>
                          <p className="text-xs text-muted-foreground mt-2">Try uploading a clearer image or a different angle of the dish.</p>
                        </div>
                      )} {/* End nutritionData check */}
                    </div> {/* End of bg-secondary/20 container */}

                    {/* Dietary Information */}
                    {recipe.tags && recipe.tags.length > 0 && (
                    <div className="pt-4">
                      <h3 className="text-sm font-medium mb-3">Dietary Information</h3>
                      <div className="flex flex-wrap gap-2">
                        {recipe.tags.map((tag, index) => (
                          <span key={index} className="bg-secondary/30 text-xs px-3 py-1.5 rounded-full hover:bg-secondary/50 transition-colors">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    )} {/* End recipe.tags check */}
                  </div> {/* End of space-y-6 container */}
                </TooltipProvider>
              )} {/* End of Nutrition Tab Content */}
            </div> {/* End of Tab Content container */}

            {/* Action buttons */}
            <div className="mt-8 flex justify-center gap-4">
              <Button
                onClick={toggleSave}
                icon={isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                variant={isSaved ? "secondary" : "primary"}
              >
                {isSaved ? "Saved" : "Save Recipe"}
              </Button>

              <Button
                onClick={toggleChat}
                icon={<MessageCircle size={18} />}
                variant="secondary"
              >
                Chat with the Chef
              </Button>
            </div>
          </div> {/* End Content Container */}
        </div> {/* End flex flex-col w-full animate-fade-in */}
      </div> {/* End relative max-w-4xl mx-auto pb-12 */}

      {/* Chat with Chef floating widget */}
      {isChatOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col">
          {/* Collapsed state */}
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow"
            >
              <MessageCircle size={24} />
            </button>
          ) : (
            <div
              className="bg-card rounded-lg shadow-xl w-[400px] flex flex-col overflow-hidden border border-border/30"
              style={{ height: isExpanded ? '80vh' : '500px' }}
            >
              {/* Chat header with context */}
              <div className="px-4 py-3 border-b border-border/50 bg-card/95">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle size={14} className="text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground">Chef Assistant</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                      aria-label={isExpanded ? "Shrink chat" : "Expand chat"}
                    >
                      {isExpanded ? (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.5 2C5.22386 2 5 2.22386 5 2.5V4H2.5C2.22386 4 2 4.22386 2 4.5V5.5C2 5.77614 2.22386 6 2.5 6H5V7.5C5 7.77614 5.22386 8 5.5 8H6.5C6.77614 8 7 7.77614 7 7.5V6H9.5C9.77614 6 10 5.77614 10 5.5V4.5C10 4.22386 9.77614 4 9.5 4H7V2.5C7 2.22386 6.77614 2 6.5 2H5.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 2.5C2 2.22386 2.22386 2 2.5 2H12.5C12.7761 2 13 2.22386 13 2.5V12.5C13 12.7761 12.7761 13 12.5 13H2.5C2.22386 13 2 12.7761 2 12.5V2.5ZM3 3V12H12V3H3Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                      aria-label="Minimize chat"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                      aria-label="Close chat"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {/* Recipe context bar */}
                <div className="bg-secondary/30 rounded-md px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <BookOpen size={12} />
                  <span>Currently helping with: <span className="font-medium text-foreground">{recipe.title}</span></span>
                </div>
              </div>

              {/* Chat messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-auto py-4 px-4 space-y-4 bg-secondary/20"
              >
                {chatMessages.map((message, i) => (
                  <div
                    key={i}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    {message.role === 'chef' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                        <MessageCircle size={14} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg p-3 shadow-sm",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-card text-card-foreground rounded-tl-none border border-border/50"
                      )}
                    >
                      {message.role === 'chef' ? (
                        <div className="text-sm leading-relaxed">
                          {formatChefMessage(message.content)}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                        <span className="text-primary-foreground text-xs font-medium">You</span>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && !chatMessages.some(msg => msg.id) && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                      <MessageCircle size={14} className="text-primary" />
                    </div>
                    <div className="bg-card max-w-[85%] rounded-lg p-3 rounded-tl-none border border-border/50 shadow-sm">
                      <div className="flex space-x-2 items-center h-5">
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse delay-150" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse delay-300" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="p-3 border-t border-border/50 bg-card/95">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 relative"
                >
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask about this recipe..."
                    className="flex-1 bg-secondary/30 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 border border-border/50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !currentMessage.trim()}
                    className="absolute right-2 bg-primary text-primary-foreground rounded-full p-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    <Send size={14} className={isLoading ? "opacity-0" : ""} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeCard;
