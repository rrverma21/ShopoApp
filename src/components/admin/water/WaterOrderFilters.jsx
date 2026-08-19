import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";

const WaterOrderFilters = ({ filters, setFilters, uniqueSellers = [] }) => {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      seller: 'all'
    });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.seller !== 'all';

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search Order ID, Customer Name/Phone..." 
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap gap-2 items-center">
            <Select 
                value={filters.status} 
                onValueChange={(val) => handleChange('status', val)}
            >
                <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{filters.status === 'all' ? 'All Statuses' : filters.status}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Accepted/Confirmed</SelectItem>
                    <SelectItem value="delivered">Completed/Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>

            <Select 
                value={filters.seller} 
                onValueChange={(val) => handleChange('seller', val)}
            >
                <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Filter by Seller" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sellers</SelectItem>
                    {uniqueSellers.map(seller => (
                        <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasActiveFilters && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearFilters}
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                    title="Clear Filters"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>
    </div>
  );
};

export default WaterOrderFilters;