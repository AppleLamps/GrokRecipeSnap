
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  text?: string;
  className?: string;
  variant?: 'minimal' | 'full';
}

const LoadingState: React.FC<LoadingStateProps> = ({
  text = "Analyzing your dish...",
  className,
  variant = 'full'
}) => {
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-full w-full p-6 text-center",
      className
    )}>
      <div className="relative h-20 w-20 mb-6">
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-t-2 border-accent animate-spin animation-delay-150"></div>
        <div className="absolute inset-4 rounded-full border-t-2 border-muted-foreground animate-spin animation-delay-300"></div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-display">{text}</h3>
        <p className="text-muted-foreground text-sm max-w-xs animate-pulse">
          Our AI chef is studying your image to create the perfect recipe
        </p>
      </div>
      
      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <div className="h-2 bg-muted rounded-full w-full animate-shimmer bg-gradient-to-r from-muted via-background to-muted bg-[length:200%_100%]"></div>
        <div className="h-2 bg-muted rounded-full w-3/4 animate-shimmer bg-gradient-to-r from-muted via-background to-muted bg-[length:200%_100%] animation-delay-150"></div>
        <div className="h-2 bg-muted rounded-full w-1/2 animate-shimmer bg-gradient-to-r from-muted via-background to-muted bg-[length:200%_100%] animation-delay-300"></div>
      </div>
    </div>
  );
};

export default LoadingState;
