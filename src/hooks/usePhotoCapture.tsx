import { useState, useCallback } from 'react';
import { analyzeFood, ApiResponse } from '@/utils/api';

interface UsePhotoCaptureReturn {
  photo: string | null;
  isCapturingPhoto: boolean;
  isProcessing: boolean;
  startCapture: () => void;
  cancelCapture: () => void;
  submitPhoto: (photoSrc: string) => void;
  handleFileUpload: (file: File) => void;
  reset: () => void;
  error: string | null;
  recipeData: ApiResponse | null;
}

/**
 * Helper function to clean any markdown formatting for validation purposes
 */
const cleanForValidation = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .trim();
};

export function usePhotoCapture(): UsePhotoCaptureReturn {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeData, setRecipeData] = useState<ApiResponse | null>(null);

  const startCapture = useCallback(() => {
    setIsCapturingPhoto(true);
    setError(null);
  }, []);

  const cancelCapture = useCallback(() => {
    setIsCapturingPhoto(false);
  }, []);

  const processPhoto = useCallback(async (photoSrc: string) => {
    setPhoto(photoSrc);
    setIsCapturingPhoto(false);
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log("Processing photo, size:", Math.round(photoSrc.length / 1024), "KB");
      
      // Send the photo to the XAI Vision API
      const result = await analyzeFood(photoSrc);
      
      console.log("Recipe data received:", {
        title: result.recipe.title,
        description: result.recipe.description?.substring(0, 50) + "...",
        ingredients: result.recipe.ingredients?.length || 0,
        instructions: result.recipe.instructions?.length || 0
      });
      
      // Clean title for validation to avoid failing due to markdown symbols
      const cleanTitle = cleanForValidation(result.recipe.title);
      
      if (!cleanTitle || cleanTitle === "json") {
        console.error("Invalid recipe title:", result.recipe.title);
        throw new Error("Failed to generate a valid recipe. Please try again with a clearer food image.");
      }
      
      if (!result.recipe.ingredients || result.recipe.ingredients.length === 0) {
        console.error("No ingredients found in the response");
        throw new Error("Couldn't identify ingredients in this dish. Please try a different image.");
      }
      
      setRecipeData(result);
    } catch (err: any) {
      console.error('Error processing photo:', err);
      
      // Provide more specific error messages based on the error
      if (err.message && err.message.includes("API request failed")) {
        setError('Connection to the recipe service failed. Please check your internet connection and try again.');
      } else if (err.message && err.message.includes("Failed to generate")) {
        setError(err.message);
      } else if (err.message && err.message.includes("Couldn't identify")) {
        setError(err.message);
      } else if (photoSrc.length > 10 * 1024 * 1024) { // 10MB limit
        setError('The image is too large. Please use a smaller image (under 10MB).');
      } else {
        setError('Failed to analyze the food image. Please try again with a different photo.');
      }
      
      // Reset recipe data on error
      setRecipeData(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const submitPhoto = useCallback((photoSrc: string) => {
    processPhoto(photoSrc);
  }, [processPhoto]);

  const handleFileUpload = useCallback((file: File) => {
    setError(null);
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Check file size (10MB limit for the API)
    if (file.size > 10 * 1024 * 1024) {
      setError('The image is too large. Please select an image under 10MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        processPhoto(result);
      }
    };
    reader.onerror = () => {
      setError('Error reading file. Please try a different image.');
    };
    reader.readAsDataURL(file);
  }, [processPhoto]);

  const reset = useCallback(() => {
    setPhoto(null);
    setIsCapturingPhoto(false);
    setIsProcessing(false);
    setError(null);
    setRecipeData(null);
  }, []);

  return {
    photo,
    isCapturingPhoto,
    isProcessing,
    startCapture,
    cancelCapture,
    submitPhoto,
    handleFileUpload,
    reset,
    error,
    recipeData
  };
}
