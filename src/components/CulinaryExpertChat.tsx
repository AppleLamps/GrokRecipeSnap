import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Paperclip, Image as ImageIcon } from 'lucide-react'; // Added Paperclip and ImageIcon
import { cn } from '@/lib/utils';
import Button from './Button';
import { sendMessageToExpert } from '@/utils/expertChatService'; // Import the actual service

// Define the structure for chat messages
interface ChatMessage {
  role: 'user' | 'expert';
  content: string | React.ReactNode; // Content can be text or image preview
  id?: string;
}

// Helper function to format inline text (e.g., bold)
const formatInlineText = (text: string) => {
  // Split the text by bold markers, keeping the delimiters
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    // Check if this part is bold (surrounded by **)
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-medium">
          {part.slice(2, -2)} {/* Remove the ** markers */}
        </strong>
      );
    }
    // Add handling for other inline formats here if needed (e.g., italics with *text*)
    return part; // Return plain text parts
  });
};

// Helper function to format expert's messages (similar to RecipeCard)
const formatExpertMessage = (content: string | React.ReactNode) => {
  if (typeof content !== 'string') return content; // Return directly if it's already a ReactNode (e.g., image preview)
  if (!content) return '';
  
  // Split into paragraphs
  return content.split('\n\n').map((paragraph, index) => {
    let processedParagraph = paragraph.trim();

    // --- Add step to remove markdown headers --- 
    processedParagraph = processedParagraph.replace(/^#+\s+/, ''); // Remove leading #, ##, ### etc. followed by space
    // --------------------------------------------

    // Handle unordered lists
    if (processedParagraph.startsWith('- ')) {
      const items = processedParagraph.split('\n').map(item => item.replace(/^-\s*/, '').trim());
      return (
        <ul key={index} className="list-none space-y-2 my-3 pl-4"> {/* Added padding */}
          {items.map((item, i) => (
            item && <li key={i} className="flex items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 mr-3 flex-shrink-0" /> {/* Adjusted spacing */}
              {formatInlineText(item)}{/* Apply inline formatting to list item text */}
            </li>
          ))}
        </ul>
      );
    }
    
    // Handle numbered lists
    if (processedParagraph.match(/^\d+\.\s/)) {
      const items = processedParagraph.split('\n').map(item => item.trim());
      return (
        <ol key={index} className="list-none space-y-2 my-3 pl-1"> {/* Adjusted padding */}
          {items.map((item, i) => {
            const match = item.match(/^(\d+)\.\s*(.*)/);
            if (!match) return null;
            const number = match[1];
            const text = match[2];
            return (
              text && <li key={i} className="flex items-start">
                <span className="w-6 flex-shrink-0 font-medium text-primary/80">{number}.</span> {/* Adjusted width */}
                {formatInlineText(text)} {/* Apply inline formatting to list item text */}
              </li>
            );
          })}
        </ol>
      );
    }
    
    // Regular paragraphs
    return (
      <p key={index} className={index > 0 ? 'mt-3' : ''}>
        {formatInlineText(processedParagraph)} {/* Use the processed paragraph */}
      </p>
    );
  });
};

interface CulinaryExpertChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const CulinaryExpertChat: React.FC<CulinaryExpertChatProps> = ({ isOpen, onClose }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // State for uploaded image preview (Data URL)
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial greeting message
  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      setChatMessages([{
        role: 'expert',
        content: "Hello! I'm your Culinary Expert. Ask me anything about food, cooking techniques, recipes, or upload a photo!"
      }]);
    }
  }, [isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() && !uploadedImage) return;

    const userMessageContent: React.ReactNode[] = [];
    if (uploadedImage) {
      userMessageContent.push(
        <img key="img" src={uploadedImage} alt="Uploaded preview" className="max-w-xs max-h-40 rounded-md my-2" />
      );
    }
    if (currentMessage.trim()) {
       userMessageContent.push(<span key="text">{currentMessage.trim()}</span>);
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: <>{userMessageContent}</>
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage.trim(); // Capture text message before clearing
    const imageToSend = uploadedImage; // Capture image before clearing

    setCurrentMessage('');
    setUploadedImage(null);
    setIsLoading(true);

    try {
      // --- Replace placeholder with actual API call ---
      // console.log("Sending to expert:", { message: messageToSend, image: imageToSend ? 'Image present' : 'No image' });
      // await new Promise(resolve => setTimeout(resolve, 1500));

      const tempMessageId = `temp-${Date.now()}`;
      setChatMessages(prev => [...prev, { 
        role: 'expert', 
        content: '', // Start with empty content
        id: tempMessageId
      }]);
      
      // Call the actual expert chat service
      await sendMessageToExpert(
        messageToSend,
        imageToSend, // Pass the base64 image data or null
        chatMessages, // Pass the current history
        (chunkText, isDone) => {
          // Update the expert's message content with each chunk
          setChatMessages(prev => 
            prev.map(msg => 
              msg.id === tempMessageId 
                ? { ...msg, content: chunkText } // Update with formatted chunk
                : msg
            )
          );
          
          // When all chunks are received, remove loading state
          if (isDone) {
            setIsLoading(false);
          }
        }
      );
      // --- End of API call replacement ---

    } catch (error) {
      console.error('Error sending message to expert:', error);
      setChatMessages(prev => [...prev, { 
        role: 'expert', 
        content: 'Sorry, I encountered an issue. Please try again.' 
      }]);
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
     // Reset file input value to allow re-uploading the same file
     if(event.target) event.target.value = ''; 
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Hidden file input */}
       <input 
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      <div 
        className="bg-card rounded-lg shadow-xl w-[400px] flex flex-col overflow-hidden border border-border/30"
        style={{ height: '60vh', maxHeight: '700px' }} // Adjust height as needed
      >
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border/50 bg-card/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare size={14} className="text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Culinary Expert</h3>
            </div>
            <button 
              onClick={onClose}
              className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {/* Chat messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-auto py-4 px-4 space-y-4 bg-secondary/20"
        >
          {chatMessages.map((message, i) => (
            <div 
              key={message.id || i} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {message.role === 'expert' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <MessageSquare size={14} className="text-primary" />
                </div>
              )}
              <div 
                className={cn(
                  "max-w-[85%] rounded-lg p-3 shadow-sm text-sm leading-relaxed",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-card text-card-foreground rounded-tl-none border border-border/50"
                )}
              >
                {message.role === 'expert' 
                  ? formatExpertMessage(message.content)
                  : <div className="whitespace-pre-wrap">{message.content}</div> 
                }
              </div>
               {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                  <span className="text-primary-foreground text-xs font-medium">You</span>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <MessageSquare size={14} className="text-primary" />
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
        <div className="p-4 border-t border-border/50 bg-card">
          {/* Image preview */}
           {uploadedImage && (
            <div className="mb-2 relative w-fit">
              <img src={uploadedImage} alt="Preview" className="max-h-20 rounded-md border border-border/50" />
              <button 
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-destructive/80"
                aria-label="Remove image"
              >
                <X size={10} />
              </button>
            </div>
          )}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 relative"
          >
             {/* Image Upload Button */}
            <Button 
              type="button"
              variant="ghost" 
              size="sm"
              className="h-9 w-9 text-muted-foreground hover:text-primary p-0"
              onClick={triggerFileInput}
              aria-label="Upload image"
             >
              <Paperclip size={18} />
            </Button>

            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask anything or upload an image..."
              className="flex-1 bg-secondary/30 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 border border-border/50"
            />
            <button 
              type="submit" 
              disabled={isLoading || (!currentMessage.trim() && !uploadedImage)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary text-primary-foreground rounded-full p-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              <Send size={14} className={isLoading ? "opacity-0" : ""} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CulinaryExpertChat; 