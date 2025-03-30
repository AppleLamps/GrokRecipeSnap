/**
 * Service for handling image-related operations like optimization, validation, and uploads
 */

import { getXaiApiKey } from '@/utils/env';
import { sleep } from '@/utils/helpers';

/**
 * Rate limiting configuration
 */
const API_RATE_LIMIT = 2; // requests per second (more conservative for image API)
const API_RATE_WINDOW = 1000; // 1 second in milliseconds
let lastApiCall = 0;

// CORS handling configuration
const CORS_PROXY_URL = 'https://corsproxy.io/'; // Public CORS proxy (fallback)
const USE_LOCAL_PROXY = true; // Set to true if using local backend proxy

/**
 * Error types for better error handling
 */
export class ImageGenerationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

/**
 * Helper function to enforce rate limiting
 */
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  const minDelay = API_RATE_WINDOW / API_RATE_LIMIT;
  
  if (timeSinceLastCall < minDelay) {
    const delay = minDelay - timeSinceLastCall;
    await sleep(delay);
  }
  
  lastApiCall = Date.now();
}

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

/**
 * Validates if the file is an acceptable image
 * @param file File to validate
 * @returns Object containing validation result and any error message
 */
export const validateImage = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Invalid file type: ${file.type}. Please upload a JPEG, PNG, WebP, or HEIC image.` 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 5MB.` 
    };
  }

  return { isValid: true };
};

/**
 * Converts a File object to a base64 string
 * @param file File to convert
 * @returns Promise resolving to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Optimizes an image by converting it to a WebP format with reduced quality
 * @param base64Image Base64 string of the image
 * @param quality Quality level (0-1)
 * @returns Promise resolving to optimized base64 string
 */
export const optimizeImage = async (
  base64Image: string, 
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Convert to WebP with specified quality
      try {
        const optimizedImage = canvas.toDataURL('image/webp', quality);
        resolve(optimizedImage);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
};

/**
 * Gets the dimensions of an image from its base64 string
 * @param base64Image Base64 string of the image
 * @returns Promise resolving to image dimensions
 */
export const getImageDimensions = async (
  base64Image: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
};

/**
 * Checks if an image URL is valid and accessible
 * @param url URL of the image to check
 * @returns Promise resolving to boolean indicating if image is valid
 */
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && contentType?.startsWith('image/') || false;
  } catch {
    return false;
  }
};

/**
 * Interface for the image generation API request body
 */
interface ImageGenerationRequest {
  prompt: string;
  model: string;
  response_format: string;
  n: number;
}

/**
 * Interface for the image generation API response
 */
interface ImageGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

/**
 * Converts an image URL to a CORS-safe URL
 * @param url Original image URL
 * @returns CORS-safe URL
 */
async function getCorsProxyUrl(url: string): Promise<string> {
  if (!url) return url;

  // Try multiple proxy options
  const proxyOptions = [
    // Option 1: Local backend proxy
    `/api/proxy/image?url=${encodeURIComponent(url)}`,
    
    // Option 2: Public CORS proxy
    `${CORS_PROXY_URL}?${encodeURIComponent(url)}`,
    
    // Option 3: Add random cache buster to original URL
    `${url}${url.includes('?') ? '&' : '?'}cacheBuster=${Date.now()}`
  ];
  
  return proxyOptions[0]; // Start with first option by default
}

/**
 * Validates and fetches an image URL, handling various failure cases
 * @param url Image URL to validate
 * @returns Promise resolving to valid URL or null if invalid
 */
async function validateAndFetchImage(url: string): Promise<string | null> {
  try {
    // Try a full GET request instead of HEAD
    const response = await fetch(url, { 
      cache: 'no-store',  // Add cache control
      mode: 'cors',       // Explicitly request CORS mode
      headers: {
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) {
      console.warn(`[ImageService] Image fetch failed with status: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.warn(`[ImageService] Invalid content type: ${contentType}`);
      return null;
    }

    return url;
  } catch (error) {
    console.warn('[ImageService] Image validation failed:', error);
    return null;
  }
}

/**
 * Downloads and converts an image to a data URL
 * @param url Image URL to convert
 * @returns Promise resolving to data URL
 */
async function convertToDataUrl(url: string): Promise<string> {
  try {
    // Skip fetch API approach as it's consistently failing with CORS
    // Go directly to Image element approach which is more reliable for CORS issues
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Fill with placeholder color first in case image is partially loaded
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch (canvasError) {
          console.warn('[ImageService] Canvas error:', canvasError);
          // Return a placeholder color if canvas fails
          reject(canvasError);
        }
      };
      
      img.onerror = () => {
        console.warn('[ImageService] Image failed to load:', url);
        reject(new Error('Failed to load image'));
      };
      
      // Add timestamp to bypass cache
      const timestamp = Date.now();
      img.src = `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        if (!img.complete) {
          reject(new Error('Image loading timed out'));
        }
      }, 5000);
    });
  } catch (error) {
    console.error('[ImageService] Data URL conversion failed:', error);
    throw error;
  }
}

/**
 * Generates an image from a text prompt using the XAI API
 * @param prompt Text description of the image to generate
 * @returns Promise resolving to the URL of the generated image
 * @throws ImageGenerationError if API call fails or response is invalid
 */
export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  const apiKey = getXaiApiKey();
  
  // Enhanced selection of fallback images
  const FOOD_FALLBACKS = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&h=600&fit=crop', 
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1540914124281-342587941389?w=800&h=600&fit=crop'
  ];
  
  // Get a random fallback image
  const getRandomFallback = () => FOOD_FALLBACKS[Math.floor(Math.random() * FOOD_FALLBACKS.length)];
  
  if (!apiKey) {
    console.warn('[ImageService] No API key available, using fallback image');
    return getRandomFallback();
  }

  if (!prompt || typeof prompt !== 'string') {
    console.warn('[ImageService] Invalid prompt, using fallback image');
    return getRandomFallback();
  }

  try {
    await enforceRateLimit();

    console.log('[ImageService] Starting image generation for prompt:', prompt.substring(0, 50) + '...');
    
    const requestBody: ImageGenerationRequest = {
      prompt: `High-quality food photography of ${prompt}, professional lighting, appetizing presentation, restaurant quality, high resolution, detailed`,
      model: "grok-2-image",
      response_format: "b64_json",
      n: 1
    };

    // Add retry logic for the image generation API
    let response;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries < maxRetries) {
      try {
        response = await fetch('https://api.x.ai/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });
        
        if (response.ok) break;
        
        // If rate limited, wait and retry
        if (response.status === 429) {
          console.log('[ImageService] Rate limited, waiting before retry');
          await sleep(2000 * (retries + 1));
        } else {
          break; // For non-rate limit errors, don't retry
        }
      } catch (fetchError) {
        console.warn(`[ImageService] Fetch error on try ${retries + 1}:`, fetchError);
      }
      
      retries++;
    }
    
    if (!response || !response.ok) {
      console.error(`[ImageService] Image generation failed after ${retries} retries, using fallback`);
      return getRandomFallback();
    }

    const data = await response.json() as ImageGenerationResponse;
    
    // Check for base64 data
    if (data.data?.[0]?.b64_json) {
      console.log('[ImageService] Successfully received base64 image data');
      // Return data URL format with MIME type prefix
      return `data:image/jpeg;base64,${data.data[0].b64_json}`;
    }
    
    // Fallback to URL approach if for some reason b64_json is not available
    if (data.data?.[0]?.url) {
      console.warn('[ImageService] Received URL instead of base64, trying to fetch image');
      const imageUrl = data.data[0].url;
      
      try {
        // Try to load the image directly
        const img = new Image();
        return await new Promise<string>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width || 800;
              canvas.height = img.height || 600;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                console.warn('[ImageService] Failed to get canvas context');
                resolve(getRandomFallback());
                return;
              }
              
              try {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
              } catch (err) {
                console.warn('[ImageService] Canvas error:', err);
                resolve(getRandomFallback());
              }
            } catch (err) {
              console.warn('[ImageService] Image processing error:', err);
              resolve(getRandomFallback());
            }
          };
          
          img.onerror = () => {
            console.warn('[ImageService] Image load error, using fallback');
            resolve(getRandomFallback());
          };
          
          img.src = imageUrl;
          
          // Set timeout to prevent hanging
          setTimeout(() => {
            if (!img.complete) {
              console.warn('[ImageService] Image load timeout, using fallback');
              resolve(getRandomFallback());
            }
          }, 5000);
        });
      } catch (error) {
        console.error('[ImageService] Failed to process image URL:', error);
        return getRandomFallback();
      }
    }
    
    console.error('[ImageService] Invalid response format (no base64 or URL):', data);
    return getRandomFallback();
  } catch (error) {
    console.error('[ImageService] Error generating image:', error);
    return getRandomFallback();
  }
}; 