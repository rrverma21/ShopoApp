import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function CustomerSearchDropdown({ customers = [], value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedCustomer = customers.find((c) => c.id === value);

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    const matchName = customer.name?.toLowerCase().includes(searchLower);
    const matchPhone = customer.phone?.toLowerCase().includes(searchLower);
    const matchGst = customer.gstin?.toLowerCase().includes(searchLower);
    return matchName || matchPhone || matchGst;
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

  const handleSelect = (customerId) => {
    onChange(customerId);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
      scrollToIndex(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollToIndex(activeIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredCustomers.length) {
        handleSelect(filteredCustomers[activeIndex].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const scrollToIndex = (index) => {
    if (!listRef.current || index < 0 || index >= filteredCustomers.length) return;
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
            {selectedCustomer ? selectedCustomer.name : "Select Customer..."}
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
            placeholder="Search name, phone, or GST..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search customers"
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
          {filteredCustomers.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No results found.
            </div>
          ) : (
            filteredCustomers.map((customer, index) => (
              <div
                key={customer.id}
                role="option"
                aria-selected={value === customer.id}
                onClick={() => handleSelect(customer.id)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                  activeIndex === index ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50" : "text-slate-700 dark:text-slate-300",
                  value === customer.id && "font-medium text-primary"
                )}
              >
                <div className="flex flex-col flex-1 truncate">
                  <span className="truncate">
                    <HighlightText text={customer.name} highlight={searchTerm} />
                  </span>
                  {(customer.phone || customer.gstin) && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex gap-2 truncate mt-0.5">
                      {customer.phone && <span>📞 <HighlightText text={customer.phone} highlight={searchTerm} /></span>}
                      {customer.gstin && <span>GST: <HighlightText text={customer.gstin} highlight={searchTerm} /></span>}
                    </span>
                  )}
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-primary",
                    value === customer.id ? "opacity-100" : "opacity-0"
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