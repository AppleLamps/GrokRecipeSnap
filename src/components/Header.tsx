import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  return (
    <header
      className={cn(
        "sticky top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-300",
        transparent ? "bg-transparent" : "bg-background/90 backdrop-blur-lg border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center">
          {leftAction ? (
            leftAction
          ) : (
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                R
              </div>
              <span className="text-xl md:text-2xl font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                Recipe<span className="text-primary">Snap</span>
              </span>
            </Link>
          )}
        </div>

        <nav className="flex items-center gap-4 md:gap-6">
          <Link
            to="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            Home
          </Link>
          <a
            href="https://github.com/AppleLamps/GrokRecipeSnap"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            GitHub
          </a>
          {rightAction && <div className="ml-4">{rightAction}</div>}
        </nav>
      </div>
    </header>
  );
};

export default Header;
