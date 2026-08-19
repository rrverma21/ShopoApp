import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, MapPin, Calendar as CalendarIcon, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const WaterOrderFilters = React.memo(({ 
  filters, 
  onFilterChange, 
  areas = [],
  sortConfig,
  onSortChange
}) => {
  const hasActiveFilters = filters.status !== 'all' || filters.area !== 'all' || filters.search !== '' || filters.date !== undefined || filters.priority !== 'all';

  const clearFilters = () => {
      onFilterChange('status', 'all');
      onFilterChange('area', 'all');
      onFilterChange('search', '');
      onFilterChange('date', undefined);
      onFilterChange('priority', 'all');
  };

  return (
    <div className="w-full space-y-3 bg-white/80 backdrop-blur-md p-4 rounded-xl border border-slate-200/60 shadow-sm sticky top-[72px] z-30 transition-all duration-300">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            {/* Search Bar */}
            <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                    placeholder="Search by ID, name, or phone..." 
                    className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-lg transition-all"
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                />
                {filters.search && (
                    <button 
                        onClick={() => onFilterChange('search', '')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/50"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Filters Row */}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 no-scrollbar items-center">
                 {/* Status Filter */}
                <Select value={filters.status} onValueChange={(val) => onFilterChange('status', val)}>
                    <SelectTrigger className={cn("h-10 min-w-[130px] rounded-lg border-slate-200", filters.status !== 'all' && "bg-blue-50 border-blue-200 text-blue-700")}>
                        <div className="flex items-center gap-2 truncate">
                            <Filter className="w-3.5 h-3.5 opacity-70" />
                            <span>{filters.status === 'all' ? 'Status' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                {/* Area Filter */}
                <Select value={filters.area} onValueChange={(val) => onFilterChange('area', val)}>
                    <SelectTrigger className={cn("h-10 min-w-[140px] rounded-lg border-slate-200", filters.area !== 'all' && "bg-blue-50 border-blue-200 text-blue-700")}>
                        <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-3.5 h-3.5 opacity-70" />
                            <span>{filters.area === 'all' ? 'Area' : filters.area}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {areas.map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Date Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "h-10 justify-start text-left font-normal min-w-[140px] border-slate-200 rounded-lg",
                                !filters.date && "text-muted-foreground",
                                filters.date && "bg-blue-50 border-blue-200 text-blue-700"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                            {filters.date ? format(filters.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filters.date}
                            onSelect={(date) => onFilterChange('date', date)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                 {/* Sort Dropdown */}
                 <Select value={sortConfig.key} onValueChange={(val) => onSortChange(val)}>
                    <SelectTrigger className="h-10 min-w-[140px] rounded-lg border-slate-200">
                        <div className="flex items-center gap-2 truncate">
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                            <span>Sort by</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Newest First</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="total_price">Value (High-Low)</SelectItem>
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={clearFilters}
                        className="h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 rounded-lg"
                        title="Clear All Filters"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
});

WaterOrderFilters.displayName = "WaterOrderFilters";

export default WaterOrderFilters;