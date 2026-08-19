import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const gradientButtonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-[hsl(var(--primary-gradient-from))] to-[hsl(var(--primary-gradient-to))] text-white hover:from-[hsl(var(--primary-gradient-hover-from))] hover:to-[hsl(var(--primary-gradient-hover-to))] hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] focus-visible:ring-ring border-none shadow-md',
        secondary:
          'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 hover:scale-[1.02] active:scale-[0.98]',
        tertiary:
          'bg-transparent text-primary hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98]',
        icon:
          'hover:bg-accent hover:text-accent-foreground hover:scale-[1.05] active:scale-[0.95] bg-transparent text-slate-600 dark:text-slate-300',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

const GradientButton = React.forwardRef(({ className, variant, size, isLoading, children, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(gradientButtonVariants({ variant, size, className }))}
      ref={ref}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Comp>
  );
});
GradientButton.displayName = 'GradientButton';

export { GradientButton, gradientButtonVariants };
export default GradientButton;