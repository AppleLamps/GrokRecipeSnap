
import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onClose?: () => void;
  className?: string;
}

const CameraComponent: React.FC<CameraProps> = ({ 
  onCapture, 
  onClose,
  className 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isImageSelected, setIsImageSelected] = useState(false);
  
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);
  
  const startCamera = async () => {
    try {
      const constraints = { 
        video: { 
          facingMode: 'environment',
          aspectRatio: 4/3,
          width: { ideal: 1920 },
          height: { ideal: 1440 }
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraSupported(false);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };
  
  const captureImage = () => {
    if (videoRef.current && isStreaming) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setImageSrc(dataUrl);
        setIsImageSelected(true);
      }
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageSrc(result);
        setIsImageSelected(true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const useImage = () => {
    if (imageSrc) {
      onCapture(imageSrc);
    }
  };
  
  const resetCamera = () => {
    setImageSrc(null);
    setIsImageSelected(false);
    startCamera();
  };
  
  return (
    <div className={cn("relative flex flex-col w-full h-full", className)}>
      {!isImageSelected ? (
        <>
          {isCameraSupported ? (
            <div className="relative flex-1 bg-black overflow-hidden rounded-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {onClose && (
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 bg-background/70 backdrop-blur-sm rounded-full text-foreground"
                >
                  <X size={20} />
                </button>
              )}
              
              <div className="absolute inset-0 grid items-center pointer-events-none">
                <div className="border-2 border-white/50 m-8 aspect-square rounded-lg"></div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/30 rounded-2xl">
              <div className="text-center max-w-xs">
                <div className="mb-4 mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-muted">
                  <Camera size={28} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg mb-2">Camera access required</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Please allow camera access to snap your food photo, or upload an image from your gallery.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-center gap-4 py-6">
            <label htmlFor="image-upload">
              <Button 
                variant="outline"
                size="lg"
                icon={<ImageIcon size={18} />}
                className="cursor-pointer"
              >
                Gallery
              </Button>
              <input 
                id="image-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
            
            <Button
              size="lg"
              onClick={captureImage}
              disabled={!isStreaming}
              icon={<Camera size={18} />}
            >
              Capture
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex-1 bg-black overflow-hidden rounded-2xl">
            {imageSrc && (
              <img 
                src={imageSrc} 
                alt="Captured" 
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}
          </div>
          
          <div className="flex justify-center gap-4 py-6">
            <Button 
              variant="outline"
              size="lg"
              onClick={resetCamera}
            >
              Retake
            </Button>
            
            <Button
              size="lg"
              onClick={useImage}
            >
              Use Photo
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CameraComponent;
