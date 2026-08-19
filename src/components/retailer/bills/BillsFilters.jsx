import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarPlus as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const BillsFilters = ({ filters, setFilters, categories }) => {
    
    const paymentMethods = ['Cash', 'Cheque', 'UPI', 'Online'];

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleDateRangeChange = (range) => {
        setFilters(prev => ({ ...prev, dateRange: range }));
    };
    
    const resetFilters = () => {
        setFilters({
            status: 'all',
            category: 'all',
            paymentMethod: 'all',
            dateRange: { from: null, to: null }
        });
    };

  return (
    <div className="p-4 bg-muted/50 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
        </Select>

        <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
            </SelectContent>
        </Select>

        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full md:w-auto justify-start text-left font-normal"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? 
                        (filters.dateRange.to ? `${format(filters.dateRange.from, "LLL dd, y")} - ${format(filters.dateRange.to, "LLL dd, y")}` : format(filters.dateRange.from, "LLL dd, y"))
                        : <span>Pick a date range</span>
                    }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    selected={filters.dateRange}
                    onSelect={handleDateRangeChange}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
        
        <Button variant="ghost" onClick={resetFilters}>Reset</Button>
    </div>
  );
};

export default BillsFilters;