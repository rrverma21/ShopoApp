import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { isValidDate } from '@/utils/dateUtils';

const ExpenseFilters = ({ 
  filters, 
  setFilters, 
  onReset 
}) => {
  const handleQuickFilter = (type) => {
    const now = new Date();
    let start;
    switch (type) {
      case 'today':
        start = now;
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      default:
        start = subDays(now, 30);
    }
    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    }));
  };

  return (
    <Card className="expense-card mb-6 animate-in fade-in slide-in-from-top-4 duration-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          
          {/* Top Row: Quick Dates & Date Range */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('today')} className="text-xs h-8 text-slate-700 dark:text-slate-300">Today</Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('week')} className="text-xs h-8 text-slate-700 dark:text-slate-300">This Week</Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickFilter('month')} className="text-xs h-8 text-slate-700 dark:text-slate-300">This Month</Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center border rounded-md px-3 py-1 ${!isValidDate(filters.startDate) && filters.startDate !== '' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950'}`}>
                <CalendarIcon className="h-4 w-4 text-slate-400 mr-2" />
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))}
                  className="bg-transparent border-none text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>
              <span className="text-slate-500 text-sm">to</span>
              <div className={`flex items-center border rounded-md px-3 py-1 ${!isValidDate(filters.endDate) && filters.endDate !== '' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950'}`}>
                <CalendarIcon className="h-4 w-4 text-slate-400 mr-2" />
                <input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))}
                  className="bg-transparent border-none text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Search & Dropdowns */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search Bill ID, Vendor, Desc..." 
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({...prev, searchQuery: e.target.value}))}
                className="pl-9 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
              />
            </div>
            
            <Select value={filters.expenseType} onValueChange={(v) => setFilters(prev => ({...prev, expenseType: v}))}>
              <SelectTrigger className="w-full md:w-[150px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Purchase Bill">Purchase Bills</SelectItem>
                <SelectItem value="Custom Expense">Custom Expenses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({...prev, category: v}))}>
              <SelectTrigger className="w-full md:w-[150px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Inventory Purchase">Inventory Purchase</SelectItem>
                <SelectItem value="Utility Bills">Utility Bills</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                <SelectItem value="Salaries">Salaries</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={onReset} className="shrink-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300" title="Reset Filters">
              <X className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseFilters;