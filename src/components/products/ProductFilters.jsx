import React from 'react';
    import { motion, AnimatePresence } from 'framer-motion';
    import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
    import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Button } from '@/components/ui/button';
    import { X, SlidersHorizontal, Download } from 'lucide-react';

    const FilterSection = ({ title, options, selected, onSelect, showCount = false }) => {
      return (
        <AccordionItem value={title}>
          <AccordionTrigger className="text-base font-semibold">{title}</AccordionTrigger>
          <AccordionContent>
            <Command>
              <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
              <CommandList className="max-h-48">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      onSelect={() => onSelect(option.name)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.includes(option.name)}
                        className="mr-2"
                      />
                      <span className="flex-grow">{option.name}</span>
                      {showCount && <span className="text-xs text-slate-500 dark:text-slate-400">{option.productCount}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </AccordionContent>
        </AccordionItem>
      );
    };

    const ProductFilters = ({ categories, brands, onFilterChange, activeFilters, onMobileToggle, isMobileFiltersOpen, onDownload, isDownloading }) => {

      const handleCategorySelect = (category) => {
        const newCategories = activeFilters.categories.includes(category)
          ? activeFilters.categories.filter(c => c !== category)
          : [...activeFilters.categories, category];
        onFilterChange({ ...activeFilters, categories: newCategories });
      };

      const handleBrandSelect = (brand) => {
        const newBrands = activeFilters.brands.includes(brand)
          ? activeFilters.brands.filter(b => b !== brand)
          : [...activeFilters.brands, brand];
        onFilterChange({ ...activeFilters, brands: newBrands });
      };

      const clearFilters = () => {
        onFilterChange({ categories: [], brands: [] });
      };

      const hasActiveFilters = activeFilters.categories.length > 0 || activeFilters.brands.length > 0;
      const canDownload = activeFilters.categories.length > 0;

      const filterContent = (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          <Accordion type="multiple" defaultValue={['Category', 'Brand']} className="w-full">
            <FilterSection
              title="Category"
              options={categories}
              selected={activeFilters.categories}
              onSelect={handleCategorySelect}
              showCount={true}
            />
            <FilterSection
              title="Brand"
              options={brands}
              selected={activeFilters.brands}
              onSelect={handleBrandSelect}
              showCount={true}
            />
          </Accordion>
          {canDownload && (
            <Button onClick={onDownload} disabled={isDownloading} className="w-full btn-secondary mt-4">
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download List'}
            </Button>
          )}
        </div>
      );

      return (
        <>
          <AnimatePresence>
            {isMobileFiltersOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                onClick={() => onMobileToggle(false)}
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute top-0 left-0 h-full w-4/5 max-w-sm bg-background p-6 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onMobileToggle(false)}
                    className="absolute top-4 right-4"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  {filterContent}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <aside className="hidden lg:block lg:w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-28 glass-effect p-6 rounded-2xl">
              {filterContent}
            </div>
          </aside>
        </>
      );
    };

    export default ProductFilters;