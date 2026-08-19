import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function BlogSearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        type="text"
        className="pl-10 pr-10 w-full bg-background border-input focus-visible:ring-primary/30 text-foreground placeholder:text-muted-foreground"
        placeholder="Search articles by title or keyword..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-foreground"
          onClick={() => onSearchChange('')}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}