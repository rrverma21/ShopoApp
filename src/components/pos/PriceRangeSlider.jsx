import React, { useState, useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatPrice } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const PriceRangeSlider = ({ min, max, value, onValueChange, className }) => {
  const [localValue, setLocalValue] = useState(value || [min, max]);

  useEffect(() => {
    setLocalValue(value || [min, max]);
  }, [value, min, max]);

  const handleSliderChange = (newValue) => {
    setLocalValue(newValue);
    onValueChange(newValue);
  };

  const handleInputChange = (index, newValue) => {
    const val = parseInt(newValue, 10);
    if (isNaN(val)) return;

    const newRange = [...localValue];
    newRange[index] = val;
    
    // Simple validation to keep min <= max
    if (index === 0 && val > newRange[1]) newRange[1] = val;
    if (index === 1 && val < newRange[0]) newRange[0] = val;

    setLocalValue(newRange);
    onValueChange(newRange);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={1}
        value={localValue}
        onValueChange={handleSliderChange}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <SliderPrimitive.Range className="absolute h-full bg-blue-600" />
        </SliderPrimitive.Track>
        {localValue.map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            className="block h-5 w-5 rounded-full border-2 border-blue-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing shadow-sm"
          />
        ))}
      </SliderPrimitive.Root>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Min Price</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
            <Input 
              type="number" 
              min={min} 
              max={max}
              value={localValue[0]} 
              onChange={(e) => handleInputChange(0, e.target.value)}
              className="h-8 pl-5 text-xs"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Max Price</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
            <Input 
              type="number" 
              min={min} 
              max={max}
              value={localValue[1]} 
              onChange={(e) => handleInputChange(1, e.target.value)}
              className="h-8 pl-5 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceRangeSlider;