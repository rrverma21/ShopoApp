import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function BlogCategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="w-full mb-8 relative">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-2 p-1">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            className={cn(
              "rounded-full px-5 text-sm transition-all",
              selectedCategory === null 
                ? "shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onSelectCategory(null)}
          >
            All Posts
          </Button>
          
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              className={cn(
                "rounded-full px-5 text-sm transition-all",
                selectedCategory === category.id 
                  ? "shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onSelectCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
}