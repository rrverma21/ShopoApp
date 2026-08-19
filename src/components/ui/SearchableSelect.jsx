import React, { useState, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

const SearchableSelect = React.memo(({ 
  options = [], 
  value, 
  onSelect, 
  placeholder = "Select...", 
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  renderOption,
  itemClassName
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(() => 
    options.find((option) => option.value === value),
    [options, value]
  );

  const handleSelect = useCallback((currentValue) => {
    onSelect(currentValue);
    setOpen(false);
    setSearch("");
  }, [onSelect]);

  const handleClearSearch = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setSearch("");
  }, []);

  // Filter options based on search
  const filteredOptions = useMemo(() => 
    options.filter((option) => {
      const searchContent = option.searchLabel || option.label;
      return searchContent.toLowerCase().includes(search.toLowerCase());
    }),
    [options, search]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-white h-auto min-h-[44px]", className)}
          disabled={disabled}
        >
          <span className="truncate text-left whitespace-normal">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="relative border-b border-slate-100">
             <CommandInput 
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={setSearch}
                className="pr-8" 
             />
             {search && (
                <button 
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  <X className="h-3 w-3" />
                </button>
             )}
          </div>
          <CommandList className="max-h-[60vh] overflow-y-auto">
            {filteredOptions.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                No results found.
              </CommandEmpty>
            )}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-900 aria-selected:bg-blue-50 aria-selected:text-blue-900", 
                    itemClassName
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {renderOption ? renderOption(option) : option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

SearchableSelect.displayName = "SearchableSelect";

export default SearchableSelect;