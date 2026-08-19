import React, { useState, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SearchableDropdown = ({
  options = [],
  value,
  onChange,
  label = "Select option...",
  placeholder = "Search...",
  isLoading = false,
  disabled = false,
  required = false,
  error,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Find selected label
  const selectedLabel = options.find((option) => option.id === value)?.name;

  const handleSelect = (currentValue) => {
    // Toggle selection: if clicking already selected item, clear it.
    onChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    setSearchTerm("");
  };

  // Filter options client-side for immediate feedback
  const filteredOptions = options.filter(option =>
    option.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between bg-background px-3 font-normal text-left",
              !value && "text-muted-foreground",
              error && "border-red-500 ring-red-500",
              className
            )}
          >
            <span className="truncate">
              {selectedLabel || label}
            </span>
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
              autoFocus
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.name} // Use name for value to aid accessibility/defaults
                      onSelect={() => handleSelect(option.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default SearchableDropdown;