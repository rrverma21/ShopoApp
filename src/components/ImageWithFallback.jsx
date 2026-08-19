import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ImageWithFallback = ({ 
  src, 
  alt, 
  className, 
  fallbackGradient = "from-slate-700 to-slate-800",
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fallback view (Gradient)
  if (error || !src) {
    return (
      <div 
        className={cn(
          `w-full h-full bg-gradient-to-br ${fallbackGradient}`, 
          className
        )} 
        role="img" 
        aria-label={alt}
      />
    );
  }

  // Image view with Skeleton loading state
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
        loading="lazy"
        {...props}
      />
    </div>
  );
};

export default ImageWithFallback;