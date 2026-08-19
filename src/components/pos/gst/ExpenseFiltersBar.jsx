import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarPlus as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const EXPENSE_TYPES = [
  'All Types',
  'Light Bill',
  'Water Bill',
  'Shop Rent',
  'Maintenance',
  'Insurance',
  'Utilities',
  'Other'
];

const PAYMENT_METHODS = [
  'All Methods',
  'Cash',
  'Bank Transfer',
  'Cheque',
  'Card',
  'Other'
];

const ExpenseFiltersBar = ({ filters, onFiltersChange }) => {
  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleDateRangeChange = (type, date) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [type]: date
      }
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      expenseType: 'All Types',
      paymentMethod: 'All Methods',
      searchDescription: '',
      searchReference: '',
      dateRange: { start: null, end: null }
    });
  };

  const hasActiveFilters = 
    filters.expenseType !== 'All Types' ||
    filters.paymentMethod !== 'All Methods' ||
    filters.searchDescription !== '' ||
    filters.searchReference !== '' ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Expense Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expense Type</label>
            <Select value={filters.expenseType} onValueChange={(value) => handleFilterChange('expenseType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
            <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date Range</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !filters.dateRange.start && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.start ? format(filters.dateRange.start, 'PPP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filters.dateRange.start} onSelect={(date) => handleDateRangeChange('start', date)} initialFocus />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !filters.dateRange.end && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.end ? format(filters.dateRange.end, 'PPP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filters.dateRange.end} onSelect={(date) => handleDateRangeChange('end', date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search by Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Search Description</label>
            <Input 
              placeholder="Search in description..." 
              value={filters.searchDescription}
              onChange={(e) => handleFilterChange('searchDescription', e.target.value)}
            />
          </div>

          {/* Search by Reference */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reference No</label>
            <Input 
              placeholder="Search reference..." 
              value={filters.searchReference}
              onChange={(e) => handleFilterChange('searchReference', e.target.value)}
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseFiltersBar;