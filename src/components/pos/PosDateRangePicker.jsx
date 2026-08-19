import React, { useState, useEffect, useRef } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, 
  startOfWeek, endOfWeek, subDays, startOfYear, endOfYear, 
  subYears, isBefore, startOfDay, endOfDay
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function PosDateRangePicker({ initialStartDate, initialEndDate, onDateRangeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(initialStartDate || null);
  const [endDate, setEndDate] = useState(initialEndDate || null);
  
  const [tempStart, setTempStart] = useState(initialStartDate || null);
  const [tempEnd, setTempEnd] = useState(initialEndDate || null);
  const [hoverDate, setHoverDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialStartDate || new Date()));
  const [activePreset, setActivePreset] = useState('Custom range');

  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setTempStart(startDate);
        setTempEnd(endDate);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, startDate, endDate]);

  const today = new Date();
  
  const PRESETS = [
    { label: 'Today', getValue: () => [startOfDay(today), endOfDay(today)] },
    { label: 'Yesterday', getValue: () => [startOfDay(subDays(today, 1)), endOfDay(subDays(today, 1))] },
    { label: 'Last 7 days', getValue: () => [startOfDay(subDays(today, 6)), endOfDay(today)] },
    { label: 'Last 30 days', getValue: () => [startOfDay(subDays(today, 29)), endOfDay(today)] },
    { label: 'This Month', getValue: () => [startOfMonth(today), endOfMonth(today)] },
    { label: 'Last Month', getValue: () => [startOfMonth(subMonths(today, 1)), endOfMonth(subMonths(today, 1))] },
    { label: 'This Year', getValue: () => [startOfYear(today), endOfYear(today)] },
    { label: 'Last Year', getValue: () => [startOfYear(subYears(today, 1)), endOfYear(subYears(today, 1))] }
  ];

  const handlePresetClick = (preset) => {
    setActivePreset(preset.label);
    const [start, end] = preset.getValue();
    setTempStart(start);
    setTempEnd(end);
    setCurrentMonth(startOfMonth(start));
  };

  const handleDateClick = (date) => {
    setActivePreset('Custom range');
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(startOfDay(date));
      setTempEnd(null);
    } else {
      if (isBefore(date, tempStart)) {
        setTempEnd(endOfDay(tempStart));
        setTempStart(startOfDay(date));
      } else {
        setTempEnd(endOfDay(date));
      }
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      setStartDate(tempStart);
      setEndDate(tempEnd);
      setIsOpen(false);
      if (onDateRangeChange) {
        onDateRangeChange({ startDate: tempStart, endDate: tempEnd });
      }
    }
  };

  const handleCancel = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }); // Sunday start
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[hsl(var(--pos-picker-muted))] hover:bg-[hsl(var(--pos-picker-hover))] hover:text-[hsl(var(--pos-picker-text))]"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-[hsl(var(--pos-picker-text))]">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[hsl(var(--pos-picker-muted))] hover:bg-[hsl(var(--pos-picker-hover))] hover:text-[hsl(var(--pos-picker-text))]"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium text-[hsl(var(--pos-picker-muted))]">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="h-8 flex items-center justify-center">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-sm" onMouseLeave={() => setHoverDate(null)}>
          {days.map((day, idx) => {
            const isSelectedStart = tempStart && isSameDay(day, tempStart);
            const isSelectedEnd = tempEnd && isSameDay(day, tempEnd);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            // Check if day is within range
            let inRange = false;
            if (tempStart && tempEnd) {
              inRange = isWithinInterval(day, { start: tempStart, end: tempEnd });
            } else if (tempStart && hoverDate) {
              const rStart = isBefore(hoverDate, tempStart) ? hoverDate : tempStart;
              const rEnd = isBefore(hoverDate, tempStart) ? tempStart : hoverDate;
              inRange = isWithinInterval(day, { start: rStart, end: rEnd });
            }

            return (
              <button
                key={day.toISOString() + idx}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => setHoverDate(day)}
                tabIndex={0}
                className={`
                  h-10 w-10 flex items-center justify-center rounded-[var(--pos-picker-radius)] transition-colors relative mx-auto
                  ${!isCurrentMonth ? 'text-[hsl(var(--pos-picker-muted))] opacity-50' : 'text-[hsl(var(--pos-picker-text))]'}
                  ${(isSelectedStart || isSelectedEnd) ? 'bg-[hsl(var(--pos-picker-accent))] text-[hsl(var(--pos-picker-accent-fg))] font-bold shadow-md hover:bg-[hsl(var(--pos-picker-accent-hover))] z-10' : ''}
                  ${(!isSelectedStart && !isSelectedEnd && inRange) ? 'bg-[hsl(var(--pos-picker-range))] text-[hsl(var(--pos-picker-text))]' : ''}
                  ${(!isSelectedStart && !isSelectedEnd && !inRange) ? 'hover:bg-[hsl(var(--pos-picker-hover))]' : ''}
                `}
                aria-label={format(day, 'PP')}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const formattedDisplay = startDate && endDate 
    ? `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
    : 'Select date range';

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      <Button 
        onClick={() => setIsOpen(!isOpen)} 
        variant="outline" 
        className={`w-full sm:w-[280px] justify-start text-left font-normal bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${isOpen ? 'ring-2 ring-[hsl(var(--pos-picker-accent))]' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span className="truncate">{formattedDisplay}</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-12 left-0 sm:right-auto right-0 z-50 bg-[hsl(var(--pos-picker-bg))] border border-[hsl(var(--pos-picker-border))] shadow-2xl rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-6 w-[calc(100vw-2rem)] sm:w-auto max-w-[800px]"
            role="dialog"
            aria-label="Date range picker"
          >
            {/* Presets Sidebar */}
            <div className="flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-[hsl(var(--pos-picker-border))] pb-4 md:pb-0 md:pr-4 overflow-x-auto no-scrollbar sm:min-w-[140px]">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-2 text-sm text-left rounded-md transition-colors whitespace-nowrap md:whitespace-normal
                    ${activePreset === preset.label 
                      ? 'bg-[hsl(var(--pos-picker-accent))] text-[hsl(var(--pos-picker-accent-fg))] font-medium' 
                      : 'text-[hsl(var(--pos-picker-text))] hover:bg-[hsl(var(--pos-picker-hover))]'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar Section */}
            <div className="flex flex-col flex-1 min-w-[260px]">
              {renderCalendar()}
              
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[hsl(var(--pos-picker-border))]">
                <Button 
                  variant="ghost" 
                  onClick={handleCancel}
                  className="text-[hsl(var(--pos-picker-text))] hover:bg-[hsl(var(--pos-picker-hover))] hover:text-white"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleApply}
                  disabled={!tempStart || !tempEnd}
                  className="bg-[hsl(var(--pos-picker-accent))] text-[hsl(var(--pos-picker-accent-fg))] hover:bg-[hsl(var(--pos-picker-accent-hover))]"
                >
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}