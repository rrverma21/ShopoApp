import React from 'react';
import { Share2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ShareButton = ({ onClick, className }) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "share-btn-trigger touch-target flex items-center justify-center",
              className
            )}
            aria-label="Share product"
          >
            <Share2 size={20} strokeWidth={2.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="z-[110]">
          <p>Share product</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ShareButton;