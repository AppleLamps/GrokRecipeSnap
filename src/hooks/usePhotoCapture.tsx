
import { useState, useCallback } from 'react';

interface UsePhotoCaptureReturn {
  photo: string | null;
  isCapturingPhoto: boolean;
  isProcessing: boolean;
  startCapture: () => void;
  cancelCapture: () => void;
  submitPhoto: (photoSrc: string) => void;
  reset: () => void;
  error: string | null;
}

export function usePhotoCapture(): UsePhotoCaptureReturn {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCapture = useCallback(() => {
    setIsCapturingPhoto(true);
    setError(null);
  }, []);

  const cancelCapture = useCallback(() => {
    setIsCapturingPhoto(false);
  }, []);

  const submitPhoto = useCallback((photoSrc: string) => {
    setPhoto(photoSrc);
    setIsCapturingPhoto(false);
    setIsProcessing(true);
    
    // In a real app, you would send the photo to the API here
    // For demo purposes, we'll simulate the API call with a timeout
    setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
  }, []);

  const reset = useCallback(() => {
    setPhoto(null);
    setIsCapturingPhoto(false);
    setIsProcessing(false);
    setError(null);
  }, []);

  return {
    photo,
    isCapturingPhoto,
    isProcessing,
    startCapture,
    cancelCapture,
    submitPhoto,
    reset,
    error
  };
}
