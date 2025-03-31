import { getXaiApiKey } from '@/utils/env';

// Define the structure for chat messages (consistent with CulinaryExpertChat.tsx)
interface ChatMessage {
  role: 'user' | 'expert';
  content: string | React.ReactNode; // Front-end uses ReactNode, backend needs string/structured content
  id?: string;
}

// Define the structure expected by the XAI API
interface XaiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string, detail?: string }; }>;
}

/**
 * Formats the expert's response (similar to chatService)
 * @param text The raw response text
 * @returns Formatted text with better paragraph breaks
 */
function formatExpertResponse(text: string): string {
  if (!text) return '';
  // Basic paragraph handling for now
  return text
    .replace(/\n(?!\n)/g, '\n\n') 
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sends a message (text and/or image) to the culinary expert AI and gets a response.
 * Supports streaming responses.
 * 
 * @param message The user's text message
 * @param imageData Optional base64 encoded image data (or null)
 * @param history Previous chat messages (FE format)
 * @param onChunk Callback for streaming chunks: (chunkText, isDone)
 * @returns Promise<void> (as response is handled via onChunk)
 */
export async function sendMessageToExpert(
  message: string, 
  imageData: string | null, 
  history: ChatMessage[] = [],
  onChunk: (chunk: string, done: boolean) => void
): Promise<void> {
  const apiKey = getXaiApiKey();
  
  if (!apiKey) {
    throw new Error('API key is required for chat functionality');
  }

  // Convert FE history to XAI API format (filtering out non-string content for history)
  const messageHistory: XaiChatMessage[] = history
    .filter(msg => typeof msg.content === 'string') // Only include text history for context
    .map(msg => ({
      role: msg.role === 'expert' ? 'assistant' : 'user',
      content: msg.content as string // We filtered non-strings
    }));

  // Define the system prompt for the culinary expert
  const systemMessage = `You are a friendly, knowledgeable, and versatile Culinary Expert AI. 
Answer general questions about cooking, recipes, ingredients, techniques, food science, nutrition, and culinary history.
If the user uploads an image, analyze it and provide relevant information, such as identifying the dish, suggesting recipes, or answering questions about it.

FORMAT YOUR RESPONSES CLEARLY. Use paragraphs for text. If analyzing an image, describe what you see first, then answer any related questions.
Keep your tone helpful, encouraging, and informative.`;

  // Construct the user message content for the API
  const userApiContent: Array<{ type: string; text?: string; image_url?: { url: string, detail?: string }; }> = [];
  
  if (imageData) {
    // Add image part (ensure it includes the data URL prefix)
    let imageUrl = imageData;
    if (!imageData.startsWith('data:image')) {
      // Attempt to guess common types if prefix is missing (though frontend should provide it)
      imageUrl = `data:image/jpeg;base64,${imageData}`; 
    }
    userApiContent.push({
      type: "image_url",
      image_url: {
        url: imageUrl,
        detail: "high" // Use high detail for better analysis
      }
    });
  }

  // Add text part
  userApiContent.push({
    type: "text",
    text: message || (imageData ? "What can you tell me about this image?" : "Hello!") // Add default text if needed
  });

  // Determine the model based on whether an image is present
  const model = imageData ? "grok-2-vision-1212" : "grok-2-latest";

  try {
    const payload = {
      model: model,
      messages: [
        { role: "system", content: systemMessage },
        ...messageHistory,
        { role: "user", content: userApiContent }
      ],
      stream: true // Always stream for this chat
    };

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
       const errorBody = await response.text();
       console.error('Expert Chat API Error Body:', errorBody);
       throw new Error(`Expert Chat API request failed with status: ${response.status}`);
    }

    // Handle the streaming response (similar to chatService.ts)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }
    
    const decoder = new TextDecoder();
    let accumulatedResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onChunk(formatExpertResponse(accumulatedResponse), true); // Final chunk
        break;
      }
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
      
      for (const line of lines) {
        if (line.includes('[DONE]')) continue;
        
        try {
          const jsonString = line.substring(line.indexOf('{'));
          const data = JSON.parse(jsonString);
          const contentDelta = data.choices[0]?.delta?.content || '';
          
          if (contentDelta) {
            accumulatedResponse += contentDelta;
            // Send intermediate formatted chunk
            onChunk(formatExpertResponse(accumulatedResponse + '...'), false); 
          }
        } catch (e) {
          console.error('Error parsing streaming expert response chunk:', e, 'Line:', line);
        }
      }
    }

  } catch (error) {
    console.error('Error communicating with culinary expert AI:', error);
    // Provide a user-friendly error message via the callback
    onChunk(`Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    // Rethrow or handle as needed for internal logging
    // throw error;
  }
} 