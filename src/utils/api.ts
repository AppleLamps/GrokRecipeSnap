import { getXaiApiKey } from '@/utils/env';

// Interface for API response
export interface ApiResponse {
  recipe: {
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    cookTime: string;
    prepTime: string;
    totalTime: string;
    servings: number;
    difficulty: string;
    tags: string[];
    imageUrl?: string;
    macros?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      saturatedFat?: number; // Added saturated fat
    };
  };
}

/**
 * Remove markdown formatting from text
 * @param text The text with possible markdown formatting
 * @returns Cleaned text without markdown symbols
 */
function cleanMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Remove markdown bold/italic markers
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\_\_/g, '')
    .replace(/\_/g, '')
    // Remove markdown headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links, keeping the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove backticks that might be around code
    .replace(/`/g, '')
    // Remove double spaces that might occur when markdown is removed
    .replace(/\s{2,}/g, ' ')
    // Remove unnecessary space before or after a colon
    .replace(/\s+:/g, ':')
    .replace(/:\s+/g, ': ')
    // Replace common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Fix common formatting issues in numbered lists
    .replace(/(\d+)\s*\.\s+/g, '$1. ')
    // Remove extra whitespace that might result from removing markdown
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sends an image to the XAI Vision API and gets recipe analysis
 * @param imageData Base64 or Data URL of the image
 * @returns Promise with recipe data
 */
export async function analyzeFood(imageData: string): Promise<ApiResponse> {
  // Extract base64 data from data URL if needed
  let base64Image = imageData;
  if (imageData.startsWith('data:image')) {
    base64Image = imageData.split(',')[1];
  }

  const apiKey = getXaiApiKey();

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2-vision-1212",
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text: "You are a helpful AI that analyzes food images and provides detailed recipes. Respond with a recipe that includes: title, description, ingredients list, and step-by-step instructions. Include cooking time, servings, and difficulty. Provide detailed nutritional information per serving, including calories, protein, carbs, total fat, saturated fat, fiber, sugar, and sodium. DO NOT use markdown formatting or symbols (like *, **, #) in your response. Use plain text with clear section headings."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              },
              {
                type: "text",
                text: "What's this dish? Please provide a detailed recipe for it with a descriptive title, list of ingredients, clear instructions, and detailed nutritional information per serving. Include macros (calories, protein, carbs, total fat, saturated fat, fiber, sugar, sodium). Use plain text only, no markdown formatting."
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response:", data.choices[0].message.content);

    // Parse the response content to extract recipe information
    const recipe = parseRecipeFromResponse(data.choices[0].message.content);

    return { recipe };
  } catch (error) {
    console.error('Error analyzing food image:', error);
    throw error;
  }
}

/**
 * Parse the recipe information from the AI response text
 * This is a simple implementation and might need refinement based on actual API response format
 */
function parseRecipeFromResponse(responseText: string): ApiResponse['recipe'] {
  try {
    // Check if response is JSON (sometimes the model outputs JSON despite instructions)
    if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
      try {
        // Try to parse it as JSON
        const jsonData = JSON.parse(responseText);

        // If it's already in our expected format
        if (jsonData.title && (jsonData.ingredients || jsonData.instructions)) {
          return {
            title: cleanMarkdown(jsonData.title) || "Unknown Dish",
            description: cleanMarkdown(jsonData.description) || "",
            ingredients: Array.isArray(jsonData.ingredients)
              ? jsonData.ingredients.map(cleanMarkdown)
              : [],
            instructions: Array.isArray(jsonData.instructions)
              ? jsonData.instructions.map(cleanMarkdown)
              : [],
            cookTime: cleanMarkdown(jsonData.cookTime || jsonData.cookingTime) || "30 mins",
            prepTime: cleanMarkdown(jsonData.prepTime || jsonData.preparationTime) || "15 mins",
            totalTime: cleanMarkdown(jsonData.totalTime) || "45 mins",
            servings: jsonData.servings || jsonData.yield || 4,
            difficulty: cleanMarkdown(jsonData.difficulty) || "Medium",
            tags: Array.isArray(jsonData.tags)
              ? jsonData.tags.map(cleanMarkdown)
              : [],
            macros: jsonData.macros || jsonData.nutrition || jsonData.nutritionalInfo || null,
          };
        }
      } catch (e) {
        console.log("Response looks like JSON but failed to parse", e);
        // Continue with text parsing if JSON parsing fails
      }
    }

    // Basic parsing to extract recipe components from AI response
    const title = cleanMarkdown(extractTitle(responseText)) || "Homemade Dish";
    const description = cleanMarkdown(extractDescription(responseText)) || "";
    const ingredients = extractIngredients(responseText).map(cleanMarkdown);
    const instructions = extractInstructions(responseText).map(cleanMarkdown);

    return {
      title,
      description,
      ingredients,
      instructions,
      cookTime: cleanMarkdown(extractCookTime(responseText)) || "30 mins",
      prepTime: cleanMarkdown(extractPrepTime(responseText)) || "15 mins",
      totalTime: cleanMarkdown(extractTotalTime(responseText)) || "45 mins",
      servings: extractServings(responseText) || 4,
      difficulty: cleanMarkdown(extractDifficulty(responseText)) || "Medium",
      tags: extractTags(responseText).map(cleanMarkdown),
      macros: extractMacros(responseText),
    };
  } catch (error) {
    console.error('Error parsing recipe from response:', error);
    // Fallback to a basic structure if parsing fails
    return {
      title: "Recipe Analysis",
      description: cleanMarkdown(responseText.substring(0, 200)) + "...",
      ingredients: extractFallbackIngredients(responseText).map(cleanMarkdown),
      instructions: extractFallbackInstructions(responseText).map(cleanMarkdown),
      cookTime: "30 mins",
      prepTime: "15 mins",
      totalTime: "45 mins",
      servings: 4,
      difficulty: "Medium",
      tags: [],
      macros: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      },
    };
  }
}

// Improved helper functions to extract recipe components
function extractTitle(text: string): string | null {
  // First, check for title with specific formats that might include the "Title:" label
  const titleWithLabelPatterns = [
    /Title[:\-]*\s*(.*?)[\n\r]/im,      // "Title: Something"
    /^#\s*Title[:\-]*\s*(.*?)[\n\r]/im, // "# Title: Something"
    /^\*\*Title[:\-]*\s*(.*?)\*\*[\n\r]/im, // "**Title: Something**"
  ];

  for (const pattern of titleWithLabelPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  // If no title with label found, try to find a title at the beginning of the response
  const titlePatterns = [
    /^#\s*(.*?)[\n\r]/m,           // Markdown heading
    /^\*\*(.*?)\*\*[\n\r]/m,       // Bold text at start of line
    /^(.*?)[\n\r]/                 // First line as title
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  return null;
}

function extractDescription(text: string): string | null {
  // Try multiple patterns to find a description
  const descPatterns = [
    /(?:Description|About)[:\-]*\s*(.*?)(?=\n\n|\n#|\n##|Ingredients)/is,
    /(?:^.*[\n\r]){1,2}(.*?)(?=[\n\r]*(?:Ingredients|##))/s
  ];

  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  return null;
}

function extractIngredients(text: string): string[] {
  // Look for ingredients section
  const ingredientsMatch = text.match(/(?:Ingredients|INGREDIENTS)(?::|[\n\r]+)(.*?)(?=(?:Instructions|INSTRUCTIONS|Directions|DIRECTIONS|Preparation|Method|Steps|##|$))/is);

  if (ingredientsMatch && ingredientsMatch[1]) {
    return ingredientsMatch[1]
      .split(/[\n\r]+/)
      .map(line => line.replace(/^[-*•\d+\.]+\s*/, '').trim())
      .filter(line => line.length > 0 && !line.match(/^ingredients/i));
  }

  // Fallback: look for bullet points or numbered lists
  const bulletItems = text.match(/^[-*•]\s*(.*?)[\n\r]/gm);
  if (bulletItems && bulletItems.length > 0) {
    return bulletItems
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  return [];
}

function extractInstructions(text: string): string[] {
  // Look for instructions section
  const instructionsMatch = text.match(/(?:Instructions|INSTRUCTIONS|Directions|DIRECTIONS|Preparation|Method|Steps)(?::|[\n\r]+)(.*?)(?=(?:##|Notes|Tips|$))/is);

  if (!instructionsMatch || !instructionsMatch[1]) {
    return [];
  }

  const instructionText = instructionsMatch[1].trim();

  // First, let's separate any metadata that might be at the end of instructions
  // This is a common pattern where cooking time, servings, etc. appear after the actual steps
  const metadataRegex = /(Cooking Time|Cook Time|Total Time|Servings|Serves|Yield|Difficulty):/i;

  // Split the text at the first metadata marker
  const metadataSplit = instructionText.split(metadataRegex);
  const actualInstructionsText = metadataSplit[0].trim();

  // Handle different formats consistently by normalizing the text first

  // Check for clearly numbered steps - this is the most common format
  // Match patterns like "1. Step description" or "1) Step description"
  const numberedStepsPattern = /^\s*\d+[\.\)]\s+.+$/gm;
  const hasNumberedSteps = numberedStepsPattern.test(actualInstructionsText);

  if (hasNumberedSteps) {
    // Process as a numbered list
    const steps: string[] = [];
    const lines = actualInstructionsText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
      // Check if this is a numbered step
      const numberedMatch = line.match(/^\s*(\d+)[\.\)]\s+(.+)$/);
      if (numberedMatch) {
        // Include the number in the content for proper rendering in UI
        steps.push(line);
      } else {
        // If it's not a numbered line, check if it belongs to previous step
        if (steps.length > 0 && line.length > 0) {
          // Append to previous step if it seems to be a continuation
          steps[steps.length - 1] += " " + line;
        } else if (line.trim().length > 0) {
          // Otherwise treat as a new item
          steps.push(line);
        }
      }
    }

    return steps;
  }

  // If not clearly numbered, try to identify sections and steps
  const lines = actualInstructionsText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const steps: string[] = [];

  let currentStep = "";

  for (const line of lines) {
    // Skip if this line contains metadata markers
    if (metadataRegex.test(line)) {
      continue;
    }

    // Check if this line looks like a section header or a new step
    const isSectionHeader = line.length < 30 && line.endsWith(':');
    const isNewParagraph = line.length > 20; // Longer lines are likely full step descriptions

    if (isSectionHeader || (isNewParagraph && currentStep.length > 0)) {
      // Save previous step if exists
      if (currentStep.length > 0) {
        steps.push(currentStep);
        currentStep = "";
      }

      // Add this line as a new step or header
      steps.push(line);
    } else {
      // If not a header and we have content, append to current step
      if (currentStep.length > 0) {
        currentStep += " " + line;
      } else {
        currentStep = line;
      }
    }
  }

  // Add the last step if there's content
  if (currentStep.length > 0) {
    steps.push(currentStep);
  }

  return steps;
}

function extractCookTime(text: string): string | null {
  // Check for cook time in various formats throughout the text
  const cookTimePatterns = [
    /(?:Cook|Cooking)\s*Time:?\s*([^\n\r.;]*)/i,
    /(?:cook|cooking)(?:\s+time)?:?\s*([^\n\r.;]*)/i,
    /(?:takes|takes about|approximately)\s+([^\n\r.;]*?to cook)/i
  ];

  for (const pattern of cookTimePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  return null;
}

function extractPrepTime(text: string): string | null {
  const prepTimeMatch = text.match(/Prep(?:aration)?\s*Time:?\s*([^\n\r]*)/i);
  return prepTimeMatch ? prepTimeMatch[1].trim() : null;
}

function extractTotalTime(text: string): string | null {
  // Check for total time in various formats
  const totalTimePatterns = [
    /Total\s*Time:?\s*([^\n\r.;]*)/i,
    /(?:total|overall)(?:\s+time)?:?\s*([^\n\r.;]*)/i
  ];

  for (const pattern of totalTimePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  return null;
}

function extractServings(text: string): number | null {
  // Check for servings in various formats
  const servingsPatterns = [
    /(?:Serves|Servings|Yield|Serves:?|Servings:?|Yield:?)[:\-]*\s*(?:\*\*)?\s*(\d+)/i,
    /(?:serves|servings|yield|makes)\s+(\d+)/i,
    /(?:serves|servings|yield|makes):?\s+(\d+)/i
  ];

  for (const pattern of servingsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const servings = parseInt(match[1], 10);
      if (!isNaN(servings) && servings > 0) {
        return servings;
      }
    }
  }

  return null;
}

function extractDifficulty(text: string): string | null {
  // Check for difficulty in various formats
  const difficultyPatterns = [
    /Difficulty[:\-]*\s*(?:\*\*)?\s*([^\n\r.;]*)/i,
    /difficulty:?\s+([^\n\r.;]*)/i,
    /difficulty(?:\s+level)?:?\s+([^\n\r.;]*)/i
  ];

  for (const pattern of difficultyPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  return null;
}

function extractTags(text: string): string[] {
  const tagsMatch = text.match(/(?:Tags|Categories)[:\-]*\s*([^\n\r]*)/i);
  if (tagsMatch && tagsMatch[1]) {
    return tagsMatch[1].split(/,|;/).map(tag => tag.trim());
  }
  return [];
}

function extractMacros(text: string): { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number } | null {
  // Look for a nutrition section
  const nutritionMatch = text.match(/(?:Nutrition(?:al)?\s*(?:Information|Facts|Values|Macros)|Macros|Nutritional\s*Information)[:\-]*\s*(.*?)(?=\n\n|\n#|\n##|$)/is);

  // Default values
  const defaultMacros = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };

  if (!nutritionMatch || !nutritionMatch[1]) {
    // Try to find individual macro values anywhere in the text
    const caloriesMatch = text.match(/(?:Calories|Energy)[:\-]*\s*(\d+)/i);
    const proteinMatch = text.match(/Protein[:\-]*\s*(\d+)(?:\s*g)?/i);
    const carbsMatch = text.match(/(?:Carbs|Carbohydrates)[:\-]*\s*(\d+)(?:\s*g)?/i);
    const fatMatch = text.match(/Fat[:\-]*\s*(\d+)(?:\s*g)?/i);

    if (caloriesMatch || proteinMatch || carbsMatch || fatMatch) {
      return {
        calories: caloriesMatch ? parseInt(caloriesMatch[1], 10) : 0,
        protein: proteinMatch ? parseInt(proteinMatch[1], 10) : 0,
        carbs: carbsMatch ? parseInt(carbsMatch[1], 10) : 0,
        fat: fatMatch ? parseInt(fatMatch[1], 10) : 0
      };
    }

    return null;
  }

  const nutritionText = nutritionMatch[1];

  // Extract individual macro values
  const caloriesMatch = nutritionText.match(/(?:Calories|Energy)[:\-]*\s*(\d+)/i);
  const proteinMatch = nutritionText.match(/Protein[:\-]*\s*(\d+)(?:\s*g)?/i);
  const carbsMatch = nutritionText.match(/(?:Carbs|Carbohydrates)[:\-]*\s*(\d+)(?:\s*g)?/i);
  const fatMatch = nutritionText.match(/Fat[:\-]*\s*(\d+)(?:\s*g)?/i);
  const fiberMatch = nutritionText.match(/Fiber[:\-]*\s*(\d+)(?:\s*g)?/i);
  const sugarMatch = nutritionText.match(/Sugar[:\-]*\s*(\d+)(?:\s*g)?/i);
  const sodiumMatch = nutritionText.match(/Sodium[:\-]*\s*(\d+)(?:\s*mg)?/i);
  const saturatedFatMatch = nutritionText.match(/(?:Saturated Fat|Sat Fat)[:\-]*\s*(\d+)(?:\s*g)?/i); // Added saturated fat match

  // Build the macros object with optional fields
  const macros: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number; saturatedFat?: number } = {
    calories: caloriesMatch ? parseInt(caloriesMatch[1], 10) : 0,
    protein: proteinMatch ? parseInt(proteinMatch[1], 10) : 0,
    carbs: carbsMatch ? parseInt(carbsMatch[1], 10) : 0,
    fat: fatMatch ? parseInt(fatMatch[1], 10) : 0
  };

  // Add optional fields if they exist
  if (fiberMatch) macros.fiber = parseInt(fiberMatch[1], 10);
  if (sugarMatch) macros.sugar = parseInt(sugarMatch[1], 10);
  if (sodiumMatch) macros.sodium = parseInt(sodiumMatch[1], 10);
  if (saturatedFatMatch) macros.saturatedFat = parseInt(saturatedFatMatch[1], 10); // Added saturated fat parsing

  return macros;
}

// Last resort fallback extraction methods for when structured parsing fails
function extractFallbackIngredients(text: string): string[] {
  // Extract any lines that look like ingredients (short lines, possibly with measurements)
  const lines = text.split(/[\n\r]+/);

  return lines
    .filter(line => {
      // Likely to be an ingredient if:
      // - It's short (less than 100 chars)
      // - Contains measurements (cup, tbsp, g, oz) or food items
      // - Doesn't look like an instruction (no verbs like "mix", "stir")
      const trimmed = line.trim();
      return trimmed.length > 0 &&
             trimmed.length < 100 &&
             /\b(cup|tbsp|tsp|g|oz|lb|ml|l)\b|flour|sugar|salt|butter|oil/i.test(trimmed) &&
             !/\b(mix|stir|combine|bake|cook|preheat)\b/i.test(trimmed);
    })
    .map(line => line.trim());
}

function extractFallbackInstructions(text: string): string[] {
  // If all else fails, split the text into paragraphs and use those as instructions
  return text
    .split(/[\n\r]{2,}/)
    .map(para => para.trim())
    .filter(para => para.length > 20 && para.length < 500)
    .slice(0, 10); // Limit to 10 instructions to avoid including unrelated text
}
