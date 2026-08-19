import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarPlus as CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Custom Range', value: 'custom' }
];

const SalesDateRangeFilter = ({ startDate, endDate, onChange }) => {
  const [preset, setPreset] = useState('month');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetChange = (value) => {
    setPreset(value);
    const now = new Date();

    if (value === 'custom') {
      setIsCustom(true);
      return;
    }

    setIsCustom(false);
    let newStart, newEnd;

    switch (value) {
      case 'today':
        newStart = startOfDay(now);
        newEnd = endOfDay(now);
        break;
      case 'week':
        newStart = startOfWeek(now, { weekStartsOn: 1 });
        newEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        newStart = startOfMonth(now);
        newEnd = endOfMonth(now);
        break;
      case 'lastMonth':
        newStart = startOfMonth(subMonths(now, 1));
        newEnd = endOfMonth(subMonths(now, 1));
        break;
      default:
        newStart = startOfMonth(now);
        newEnd = endOfMonth(now);
    }

    onChange(newStart, newEnd);
  };

  const handleStartDateChange = (date) => {
    if (date) {
      onChange(startOfDay(date), endDate || endOfDay(date));
    }
  };

  const handleEndDateChange = (date) => {
    if (date) {
      onChange(startDate || startOfDay(date), endOfDay(date));
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      <div className="w-full md:w-64">
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <div className="flex gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={handleEndDateChange} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {!isCustom && startDate && endDate && (
        <div className="text-sm text-muted-foreground">
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
};

export default SalesDateRangeFilter;