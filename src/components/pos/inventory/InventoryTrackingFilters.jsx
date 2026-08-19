import React from 'react';
import { Search, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const InventoryTrackingFilters = ({ 
    searchTerm, 
    setSearchTerm, 
    filterType, 
    setFilterType, 
    dateFrom, 
    setDateFrom, 
    dateTo, 
    setDateTo 
}) => {
    return (
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-end gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 mb-4">
            
            {/* Search Input */}
            <div className="flex-1 space-y-1">
                <Label htmlFor="search-inventory" className="text-xs font-semibold text-slate-500 uppercase">Search</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        id="search-inventory"
                        placeholder="Search by Bill No or Customer..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white dark:bg-slate-950"
                    />
                </div>
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-48 space-y-1">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Transaction Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <SelectValue placeholder="All Types" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        <SelectItem value="Stock Addition">Stock Addition</SelectItem>
                        <SelectItem value="Sale">Sale</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="space-y-1 flex-1 md:w-36">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">From Date</Label>
                    <div className="relative">
                        <Input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-white dark:bg-slate-950 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1 flex-1 md:w-36">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">To Date</Label>
                    <div className="relative">
                        <Input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-white dark:bg-slate-950 text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryTrackingFilters;