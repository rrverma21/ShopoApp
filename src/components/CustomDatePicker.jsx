import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, setMonth, setYear, isBefore, isAfter, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CustomDatePicker = ({
  date = null, // Support both 'date' and 'value' props for flexibility
  value = null,
  onDateChange, // Primary prop name
  onChange, // Fallback for compatibility
  placeholder = "Select date",
  minDate,
  maxDate,
  disabled = false,
  className,
  displayFormat = "PPP" // e.g. 'PPP' for full date, 'MMM yyyy' for expiry
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Support both 'date' and 'value' props - prioritize 'date' for backward compatibility
  const selectedDate = date || value;
  
  // Support both 'onDateChange' and 'onChange' - prioritize 'onDateChange'
  const dateChangeHandler = onDateChange || onChange;
  
  // Validation and warning for missing handler
  useEffect(() => {
    if (!dateChangeHandler) {
      console.warn('CustomDatePicker: No date change handler provided. Please pass either onDateChange or onChange prop as a function.');
    } else if (typeof dateChangeHandler !== 'function') {
      console.error('CustomDatePicker: The date change handler must be a function. Received:', typeof dateChangeHandler);
    }
  }, [dateChangeHandler]);
  
  const [currentViewDate, setCurrentViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate && !isOpen) {
      setCurrentViewDate(selectedDate);
    }
  }, [selectedDate, isOpen]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const handleMonthChange = (monthIndex) => {
    setCurrentViewDate(setMonth(currentViewDate, monthIndex));
  };

  const handleYearChange = (year) => {
    setCurrentViewDate(setYear(currentViewDate, parseInt(year, 10)));
  };

  const handlePreviousMonth = () => {
    setCurrentViewDate(subMonths(currentViewDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentViewDate(addMonths(currentViewDate, 1));
  };

  const handleDateSelect = (selectedDate) => {
    // Check if date is disabled before processing
    if (isDateDisabled(selectedDate)) {
      console.warn('CustomDatePicker: Attempted to select a disabled date:', selectedDate);
      return;
    }
    
    // Defensive check: Ensure handler exists and is a function
    if (!dateChangeHandler) {
      console.error('CustomDatePicker: Cannot update date - no change handler provided');
      return;
    }
    
    if (typeof dateChangeHandler !== 'function') {
      console.error('CustomDatePicker: Change handler is not a function. Type:', typeof dateChangeHandler);
      return;
    }
    
    // Try-catch block for safe execution
    try {
      console.debug('CustomDatePicker: Date selected:', selectedDate);
      dateChangeHandler(selectedDate);
      setIsOpen(false);
    } catch (error) {
      console.error('CustomDatePicker: Error calling date change handler:', error);
      // Optionally show user-friendly error (requires toast/notification system)
      // toast({ title: 'Error', description: 'Failed to update date', variant: 'destructive' });
    }
  };

  const isDateDisabled = (date) => {
    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) return true;
    if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) return true;
    return false;
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentViewDate));
    const end = endOfWeek(endOfMonth(currentViewDate));
    return eachDayOfInterval({ start, end });
  }, [currentViewDate]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800",
            !selectedDate && "text-slate-500 dark:text-slate-400",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            (() => {
              try {
                return format(selectedDate, displayFormat);
              } catch (error) {
                console.error('CustomDatePicker: Error formatting date:', error);
                return 'Invalid Date';
              }
            })()
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 z-[100] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl" align="start">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between gap-1">
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-8 w-8 shrink-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1 flex-1 justify-center">
              <Select value={currentViewDate.getMonth().toString()} onValueChange={(val) => handleMonthChange(parseInt(val, 10))}>
                <SelectTrigger className="h-8 w-[110px] text-sm font-medium border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:ring-0 shadow-none transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] z-[110]">
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()} className={cn("cursor-pointer", index === new Date().getMonth() && "font-bold text-blue-600 dark:text-blue-400")}>
                      {month.substring(0, 3)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currentViewDate.getFullYear().toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="h-8 w-[80px] text-sm font-medium border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 focus:ring-0 shadow-none transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] z-[110]">
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()} className={cn("cursor-pointer", year === currentYear && "font-bold text-blue-600 dark:text-blue-400")}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 shrink-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="w-full">
            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[0.8rem] font-medium text-slate-500 dark:text-slate-400">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isCurrentMonth = isSameMonth(date, currentViewDate);
                const isTodayDate = isToday(date);
                const disabledDate = isDateDisabled(date);

                return (
                  <Button
                    key={i}
                    variant="ghost"
                    size="icon"
                    disabled={disabledDate}
                    onClick={() => handleDateSelect(date)}
                    className={cn(
                      "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal text-sm transition-all rounded-md",
                      !isCurrentMonth && "text-slate-400 dark:text-slate-600 opacity-50",
                      isCurrentMonth && !isSelected && !isTodayDate && "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                      isTodayDate && !isSelected && "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold",
                      isSelected && "bg-blue-600 text-white hover:bg-blue-700 hover:text-white font-medium shadow-md shadow-blue-500/30",
                      disabledDate && "opacity-30 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    {date.getDate()}
                  </Button>
                );
              })}
            </div>
          </div>
          
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CustomDatePicker;