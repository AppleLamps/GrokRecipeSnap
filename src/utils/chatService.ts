import { getXaiApiKey } from '@/utils/env';
import type { Recipe } from '@/components/RecipeCard';

interface ChatMessage {
  role: 'user' | 'chef';
  content: string;
  id?: string;
}

/**
 * Formats the chef's response with better paragraph structure
 * @param text The raw response text
 * @returns Formatted text with better paragraph breaks
 */
function formatChefResponse(text: string): string {
  if (!text) return '';

  // Ensure there are proper paragraph breaks
  // Replace single newlines with double newlines
  const withProperBreaks = text
    .replace(/\n(?!\n)/g, '\n\n')
    // Clean up any excessive newlines (more than 2)
    .replace(/\n{3,}/g, '\n\n');

  return withProperBreaks;
}

/**
 * Sends a message to the chef assistant and gets a response
 * Supports both streaming and non-streaming responses
 * 
 * @param message The user's message
 * @param recipe The current recipe context
 * @param history Previous chat messages
 * @param onChunk Optional callback for streaming chunks
 * @returns Promise with the chef's response, or void if streaming
 */
export async function sendMessageToChef(
  message: string, 
  recipe: Recipe, 
  history: ChatMessage[] = [],
  onChunk?: (chunk: string, done: boolean) => void
): Promise<string | void> {
  const apiKey = getXaiApiKey();
  
  if (!apiKey) {
    throw new Error('API key is required for chat functionality');
  }
  
  // Convert our chat history format to the format expected by the XAI API
  const messageHistory = history.map(msg => ({
    role: msg.role === 'chef' ? 'assistant' : 'user',
    content: msg.content
  }));
  
  // Create a detailed recipe context to help the AI provide relevant responses
  const recipeContext = `
Recipe: ${recipe.title}
Description: ${recipe.description}
Cooking Time: ${recipe.cookTime}
Servings: ${recipe.servings}
Ingredients:
${recipe.ingredients.map(ing => `- ${ing}`).join('\n')}

Key Instructions:
${recipe.instructions.slice(0, 5).map((step, i) => `${i + 1}. ${step}`).join('\n')}
`;

  // System message that encourages the AI to format responses with paragraphs
  const systemMessage = `You are a friendly and knowledgeable chef assistant helping someone with questions about a specific recipe. 
Answer questions about cooking techniques, ingredient substitutions, and provide helpful tips based on the recipe details provided.

FORMAT YOUR RESPONSES WITH CLEAR PARAGRAPHS instead of one long block of text. Use short paragraphs of 2-3 sentences each for better readability.

Keep your responses conversational, helpful, and concise (under 200 words).
Always relate your answers back to the specific recipe the user is preparing.
The user is preparing the following recipe: ${recipeContext}`;

  try {
    // Create the request payload
    const payload = {
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        // Include previous conversation history
        ...messageHistory,
        // Add the current user message
        {
          role: "user",
          content: message
        }
      ],
      // Enable streaming if a callback is provided
      stream: !!onChunk
    };

    // If streaming is enabled
    if (onChunk) {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Chat API request failed with status: ${response.status}`);
      }
      
      // Handle the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onChunk(formatChefResponse(accumulatedResponse), true);
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value);
        
        // Process the SSE data
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
        
        for (const line of lines) {
          // Skip the [DONE] line
          if (line.includes('[DONE]')) continue;
          
          try {
            // Extract the JSON content
            const jsonString = line.substring(line.indexOf('{'));
            const data = JSON.parse(jsonString);
            
            // Get the content delta
            const contentDelta = data.choices[0]?.delta?.content || '';
            if (contentDelta) {
              accumulatedResponse += contentDelta;
              onChunk(formatChefResponse(accumulatedResponse), false);
            }
          } catch (e) {
            console.error('Error parsing streaming response chunk:', e);
          }
        }
      }
      
      return;
    } else {
      // Non-streaming request
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Chat API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      const chefResponse = data.choices[0].message.content;
      
      // Format the response before returning
      return formatChefResponse(chefResponse);
    }
  } catch (error) {
    console.error('Error communicating with chef assistant:', error);
    throw error;
  }
} 