import React, { useState } from 'react';
import { 
  Search, SlidersHorizontal, X, ArrowDownUp, Check, 
  ChevronDown, Star, LayoutGrid, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import PriceRangeSlider from './PriceRangeSlider';
import { cn } from '@/lib/utils';

const FilterBar = ({ 
  filters, 
  setFilters, 
  categories, 
  priceBounds, 
  onClearAll,
  totalResults,
  totalProducts
}) => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFilterCount = [
    filters.category !== 'All',
    filters.availability !== 'all',
    filters.rating > 0,
    filters.priceRange[0] > priceBounds.min || filters.priceRange[1] < priceBounds.max
  ].filter(Boolean).length;

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  // Define the common dark blue color for button text
  const darkBlueText = "text-[#003D82]";
  const filterBtnClass = cn(
    "bg-white hover:bg-slate-50 border-white shadow-sm font-bold transition-all active:scale-95",
    darkBlueText
  );

  return (
    <div className="sticky top-0 z-40 bg-white border-b shadow-sm transition-all duration-200">
      {/* Desktop & Mobile Main Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 sm:p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row gap-3 items-center max-w-7xl mx-auto">
          {/* Search Input Area */}
          <div className="relative w-full sm:flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            <Input 
              placeholder="Search products..." 
              value={filters.search}
              onChange={handleSearchChange}
              className="pl-9 h-10 bg-white border-transparent text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
            />
            {filters.search && (
              <button 
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Desktop Filters (Horizontal) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Category Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn(filterBtnClass, "min-w-[140px] justify-between")}>
                  <span className="truncate max-w-[100px]">{filters.category}</span>
                  <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={filters.category} onValueChange={(val) => setFilters(prev => ({ ...prev, category: val }))}>
                  {categories.map(cat => (
                    <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn(filterBtnClass, "min-w-[140px] justify-between")}>
                  <span className="flex items-center gap-2"><ArrowDownUp className="h-3 w-3" /> Sort</span>
                  <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={filters.sort} onValueChange={(val) => setFilters(prev => ({ ...prev, sort: val }))}>
                  <DropdownMenuRadioItem value="popular">Most Popular</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_low">Price: Low to High</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_high">Price: High to Low</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="rating">Best Rated</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Filters Trigger (Desktop) */}
            <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className={cn(filterBtnClass, "gap-2 relative", activeFilterCount > 0 && "ring-2 ring-yellow-400 border-yellow-400")}>
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] absolute -top-2 -right-2 border-2 border-blue-600 shadow-sm">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    Filters
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive/90 h-8 px-2 text-xs">
                        Clear All
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <FilterContent 
                  filters={filters} 
                  setFilters={setFilters} 
                  priceBounds={priceBounds} 
                  categories={categories} 
                />
                <SheetFooter className="mt-4 sm:justify-between gap-2 border-t pt-4">
                  <div className="text-sm text-muted-foreground self-center">
                    {totalResults} results
                  </div>
                  <SheetClose asChild>
                    <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold">View Results</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile Filter Button */}
          <div className="flex md:hidden w-full gap-2">
             <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className={cn(filterBtnClass, "flex-1 gap-2 h-10")}>
                  <SlidersHorizontal className="h-4 w-4" /> 
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-0">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <SheetTitle>Filter & Sort</SheetTitle>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={onClearAll} className="text-destructive text-xs h-8">
                      Reset
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-full px-6 py-4">
                  <FilterContent 
                    filters={filters} 
                    setFilters={setFilters} 
                    priceBounds={priceBounds} 
                    categories={categories} 
                  />
                  <div className="h-20" /> {/* Spacer */}
                </ScrollArea>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
                  <SheetClose asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg text-white font-bold">
                      Show {totalResults} Products
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Quick Sort (Mobile) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn(filterBtnClass, "flex-1 h-10")}>
                  <ArrowDownUp className="h-4 w-4 mr-2" /> Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)]">
                <DropdownMenuRadioGroup value={filters.sort} onValueChange={(val) => setFilters(prev => ({ ...prev, sort: val }))}>
                  <DropdownMenuRadioItem value="popular">Most Popular</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_low">Price: Low to High</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_high">Price: High to Low</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="rating">Best Rated</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Results Bar */}
      <div className="bg-slate-50 border-b px-4 py-2 flex items-center justify-between text-xs text-muted-foreground max-w-7xl mx-auto w-full">
        <span>Showing <strong>{totalResults}</strong> of {totalProducts} products</span>
        <div className="flex gap-2">
          {(activeFilterCount > 0 || filters.search) && (
            <button 
              onClick={onClearAll}
              className="text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Internal component for the filter sheet/drawer content
const FilterContent = ({ filters, setFilters, priceBounds, categories }) => {
  return (
    <div className="space-y-8">
      {/* Category Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-blue-500" /> Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={filters.category === cat ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-xs font-medium transition-all hover:border-blue-400",
                filters.category === cat ? "bg-blue-600 hover:bg-blue-700 border-transparent text-white" : "text-muted-foreground bg-white"
              )}
              onClick={() => setFilters(prev => ({ ...prev, category: cat }))}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <span className="text-green-600 font-bold">₹</span> Price Range
        </h3>
        <PriceRangeSlider 
          min={priceBounds.min} 
          max={priceBounds.max} 
          value={filters.priceRange} 
          onValueChange={(val) => setFilters(prev => ({ ...prev, priceRange: val }))}
        />
      </div>

      <Separator />

      {/* Availability Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-500" /> Availability
        </h3>
        <div className="flex items-center space-x-2">
          <Switch 
            id="in-stock" 
            checked={filters.availability === 'in_stock'}
            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, availability: checked ? 'in_stock' : 'all' }))}
          />
          <Label htmlFor="in-stock" className="cursor-pointer">Show In-Stock Only</Label>
        </div>
      </div>

      <Separator />

      {/* Rating Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" /> Rating
        </h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <div 
              key={rating}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border",
                filters.rating === rating ? "bg-yellow-50 border-yellow-200" : "hover:bg-slate-50 border-transparent"
              )}
              onClick={() => setFilters(prev => ({ ...prev, rating: filters.rating === rating ? 0 : rating }))}
            >
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-4 w-4", 
                      i < rating ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"
                    )} 
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-medium">& Up</span>
              {filters.rating === rating && <Check className="h-4 w-4 ml-auto text-yellow-600" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;