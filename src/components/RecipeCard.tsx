import React, { useState } from 'react';
import { Clock, Users, BookOpen, Bookmark, BookmarkCheck, MessageCircle, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';
import { sendMessageToChef } from '@/utils/chatService';

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'chef', content: string, id?: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const toggleSave = () => {
    setIsSaved(!isSaved);
    
    // In a real app, you would save this to local storage or a database
    console.log(isSaved ? 'Recipe unsaved' : 'Recipe saved');
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    
    // If opening chat for the first time, add a welcome message
    if (!isChatOpen && chatMessages.length === 0) {
      setChatMessages([{
        role: 'chef',
        content: `Hello! I'm your virtual chef assistant for this ${recipe.title} recipe. Feel free to ask me any questions about ingredients, preparation, or cooking techniques!`
      }]);
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
    return recipe.instructions.map(instruction => {
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
          // This handles the specific case in the steak recipe
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
        stepNumber: stepNumber
      };
    });
  }, [recipe.instructions]);
  
  // Counter for actual steps (excluding headers)
  let stepCounter = 0;
  
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
      "flex flex-col w-full animate-fade-in relative",
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
            <div className="space-y-6">
              {processedInstructions.map((instruction, index) => {
                if (instruction.isHeader) {
                  // Render section header
                  return (
                    <h3 key={index} className="font-medium text-lg mt-8 mb-4 text-foreground">
                      {instruction.originalText}
                    </h3>
                  );
                } else {
                  // Use original step number if available, otherwise generate sequential numbers
                  const displayNumber = instruction.hasLeadingNumber 
                    ? instruction.stepNumber 
                    : index + 1 - processedInstructions.slice(0, index).filter(item => item.isHeader).length;
                  
                  // For steps with numbers, use a consistent display
                  const displayText = instruction.hasLeadingNumber 
                    ? instruction.content  // Just the content without the number
                    : instruction.content;
                  
                  return (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-secondary-foreground font-medium text-sm">{displayNumber}</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p>{displayText}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
        
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
      </div>
      
      {/* Chat with Chef overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden border border-border/30">
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center bg-card/95">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Chef Assistant</h3>
                  <p className="text-xs text-muted-foreground">Recipe expert</p>
                </div>
              </div>
              <button 
                onClick={toggleChat}
                className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 overflow-auto py-5 px-4 space-y-4 bg-secondary/20">
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
                    {message.content ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex space-x-2 items-center h-5">
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse delay-150" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse delay-300" />
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
                  className="flex-1 bg-secondary/30 rounded-full pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 border border-border/50"
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !currentMessage.trim()}
                  className="absolute right-2 bg-primary text-primary-foreground rounded-full p-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send size={16} className={isLoading ? "opacity-0" : ""} />
                </button>
              </form>
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">Ask about ingredients, substitutions, or techniques</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeCard;
