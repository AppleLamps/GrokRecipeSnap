
import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    icon,
    iconPosition = 'left',
    ...props 
  }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-full";
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
      outline: "border border-input bg-background hover:bg-accent/10 hover:text-accent-foreground active:scale-[0.98]",
      ghost: "hover:bg-accent/10 hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    };
    
    const sizes = {
      sm: "text-xs px-3 py-1.5 h-8",
      md: "text-sm px-4 py-2 h-10",
      lg: "text-base px-6 py-3 h-12",
    };
    
    const iconSpacing = iconPosition === 'left' ? 'mr-2' : 'ml-2';

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : icon && iconPosition === 'left' ? (
          <span className={iconSpacing}>{icon}</span>
        ) : null}
        
        {children}
        
        {icon && iconPosition === 'right' && !isLoading ? (
          <span className={iconSpacing}>{icon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
