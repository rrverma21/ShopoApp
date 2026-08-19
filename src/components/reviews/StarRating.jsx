import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const StarRating = ({ rating, maxRating = 5, size = "sm", onRatingChange, readOnly = false, className }) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  const starSize = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const filled = hoverRating ? starValue <= hoverRating : starValue <= rating;
        
        return (
          <button
            key={index}
            type="button"
            className={cn(
              "transition-all duration-200",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
              filled ? "text-yellow-400 fill-yellow-400" : "text-slate-200"
            )}
            onClick={() => !readOnly && onRatingChange && onRatingChange(starValue)}
            onMouseEnter={() => !readOnly && setHoverRating(starValue)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            disabled={readOnly}
          >
            <Star 
              className={cn(starSize[size])} 
              strokeWidth={filled ? 0 : 2}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;