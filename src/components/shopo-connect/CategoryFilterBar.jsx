import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function CategoryFilterBar({ categories, activeCategory, onSelectCategory }) {
  return (
    <div className="w-full bg-background border-y border-border py-4 mb-8 sticky top-16 z-30 shadow-sm">
      <div className="container mx-auto px-4 flex overflow-x-auto custom-scrollbar pb-2 items-center gap-2 sm:gap-4">
        {categories.map((category) => {
          const isActive = activeCategory === category.name;
          return (
            <button
              key={category.name}
              onClick={() => onSelectCategory(category.name)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors outline-none",
                isActive 
                  ? "text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryFilter"
                  className="absolute inset-0 bg-primary rounded-full -z-10 shadow-sm"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{category.name}</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "relative z-10 text-xs px-1.5 py-0 min-w-[20px] flex justify-center border-none",
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                )}
              >
                {category.count}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}