import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, BookOpen, Bookmark, BookmarkCheck, MessageCircle, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullView, setShowFullView] = useState(isFullView);
  
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
            </div>
            
            {/* Tab content */}
            <div className="animate-fade-in">
              {activeTab === 'ingredients' ? (
                <div className="space-y-6">
                  {/* Main ingredients list */}
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                        <span className="ml-4 leading-relaxed">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                  
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
              ) : (
                <div className="space-y-8">
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
                            {/* Always render the content directly, using the calculated displayNumber */}
                            <p className="text-muted-foreground leading-relaxed">{instruction.content}</p>
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
        </div>
      </div>

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
