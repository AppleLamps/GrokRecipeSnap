
import React from 'react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  className?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title = "RecipeSnap",
  className,
  leftAction,
  rightAction,
  transparent = false,
}) => {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-4 transition-all duration-300",
        transparent ? "bg-transparent" : "bg-background/80 backdrop-blur-lg border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center justify-between max-w-screen-lg mx-auto">
        <div className="flex items-center">
          {leftAction}
        </div>
        
        <h1 className={cn(
          "text-lg md:text-xl font-display font-medium transition-opacity duration-300", 
          transparent ? "opacity-0" : "opacity-100"
        )}>
          {title}
        </h1>
        
        <div className="flex items-center">
          {rightAction}
        </div>
      </div>
    </header>
  );
};

export default Header;
