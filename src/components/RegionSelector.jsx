import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRegion } from "@/contexts/RegionContext";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const REGIONS = [
  { id: 'india', name: 'India', flag: '🇮🇳' },
  { id: 'uk', name: 'UK', flag: '🇬🇧' },
];

const RegionSelector = () => {
  const { currentRegion, setRegion } = useRegion();

  const activeRegionId = currentRegion?.toLowerCase() === 'uk' ? 'uk' : 'india';
  const selectedRegion = REGIONS.find(r => r.id === activeRegionId) || REGIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 px-2 gap-2 region-selector-trigger"
          aria-label="Select Region"
        >
          <span className="text-base leading-none" aria-hidden="true">{selectedRegion.flag}</span>
          <span className="hidden sm:inline-block font-medium">{selectedRegion.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 region-selector-content">
        {REGIONS.map((region) => (
          <DropdownMenuItem
            key={region.id}
            onClick={() => setRegion(region.id)}
            className={cn(
              "flex items-center gap-2 cursor-pointer region-selector-item",
              activeRegionId === region.id && "bg-[hsl(var(--region-selector-active))]"
            )}
            aria-label={`Select ${region.name}`}
          >
            <span className="text-lg leading-none" aria-hidden="true">{region.flag}</span>
            <span className="flex-1 font-medium">{region.name}</span>
            {activeRegionId === region.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RegionSelector;