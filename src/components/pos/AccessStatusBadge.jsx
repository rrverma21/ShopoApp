import React from 'react';
import { formatDistanceToNow, isAfter, subHours } from 'date-fns';
import { Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const AccessStatusBadge = ({ lastAccessed, className }) => {
  if (!lastAccessed) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 whitespace-nowrap", className)}>
        <Clock className="w-3 h-3" />
        <span>Never viewed</span>
      </div>
    );
  }

  const date = new Date(lastAccessed);
  // Consider "recent" if viewed within the last 24 hours
  const isRecent = isAfter(date, subHours(new Date(), 24));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap cursor-help",
            isRecent 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" 
              : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
            className
          )}>
            {isRecent ? <Eye className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>
              {/* Show relative time like "2 hours ago" */}
              {formatDistanceToNow(date, { addSuffix: true })}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            Exact time: {date.toLocaleDateString()} at {date.toLocaleTimeString()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AccessStatusBadge;