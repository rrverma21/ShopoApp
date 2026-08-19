import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HighlightText = ({ text = '', highlight = '' }) => {
  if (!highlight.trim() || !text) return <span>{text}</span>;
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.toString().split(regex);
  
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 font-medium text-slate-900 dark:text-slate-100">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export function ProductSearchDropdown({ products = [], value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedProduct = products.find((p) => p.id === value);

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const matchName = product.name?.toLowerCase().includes(searchLower);
    const matchSku = product.sku?.toLowerCase().includes(searchLower);
    const matchHsn = product.hsn_code?.toLowerCase().includes(searchLower);
    return matchName || matchSku || matchHsn;
  });

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  const handleSelect = (productId) => {
    onChange(productId);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
      scrollToIndex(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollToIndex(activeIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredProducts.length) {
        handleSelect(filteredProducts[activeIndex].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const scrollToIndex = (index) => {
    if (!listRef.current || index < 0 || index >= filteredProducts.length) return;
    const listElement = listRef.current;
    const itemElement = listElement.children[index];
    if (itemElement) {
      const itemTop = itemElement.offsetTop;
      const itemBottom = itemTop + itemElement.offsetHeight;
      const listScrollTop = listElement.scrollTop;
      const listScrollBottom = listScrollTop + listElement.offsetHeight;

      if (itemTop < listScrollTop) {
        listElement.scrollTop = itemTop;
      } else if (itemBottom > listScrollBottom) {
        listElement.scrollTop = itemBottom - listElement.offsetHeight;
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : "Select Item..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search name, SKU, or HSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search products"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="ml-2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 opacity-50 hover:opacity-100" />
            </button>
          )}
        </div>
        
        <div 
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-1"
          role="listbox"
        >
          {filteredProducts.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No results found.
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <div
                key={product.id}
                role="option"
                aria-selected={value === product.id}
                onClick={() => handleSelect(product.id)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                  activeIndex === index ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50" : "text-slate-700 dark:text-slate-300",
                  value === product.id && "font-medium text-primary"
                )}
              >
                <div className="flex flex-col flex-1 truncate">
                  <span className="truncate font-medium">
                    <HighlightText text={product.name} highlight={searchTerm} />
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      MRP: {product.selling_price !== undefined && product.selling_price !== null ? `₹${Number(product.selling_price).toFixed(2)}` : 'N/A'}
                    </span>
                    {product.hsn_code && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>HSN: <HighlightText text={product.hsn_code} highlight={searchTerm} /></span>
                      </>
                    )}
                  </span>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-primary",
                    value === product.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}