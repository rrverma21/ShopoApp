import React, { useState, useEffect, useRef } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getPresetDates, isDateBefore, isFutureDate, isValidDate } from '@/lib/dateUtils';
import DateInputField from './DateInputField';
import PresetButtons from './PresetButtons';
import CalendarPopup from './CalendarPopup';
import BottomSheet from './BottomSheet';
import RangePill from './RangePill';

const PRESETS = [
  { label: 'Today', value: 'Today' },
  { label: 'Yesterday', value: 'Yesterday' },
  { label: 'Last 7 days', value: 'Last 7 days' },
  { label: 'Last 30 days', value: 'Last 30 days' },
  { label: 'This month', value: 'This month' },
  { label: 'Last month', value: 'Last month' },
  { label: 'Custom range', value: 'Custom range' }
];

export default function DateRangePicker({ initialStartDate, initialEndDate, onDateRangeChange }) {
  const [startDate, setStartDate] = useState(initialStartDate || null);
  const [endDate, setEndDate] = useState(initialEndDate || null);
  
  const [tempStartDate, setTempStartDate] = useState(initialStartDate || null);
  const [tempEndDate, setTempEndDate] = useState(initialEndDate || null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('Custom range');
  const [showError, setShowError] = useState(null);

  const containerRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Handle outside click for desktop popup
  useEffect(() => {
    if (!isDesktop || !isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktop, isOpen, tempStartDate, tempEndDate]);

  const handlePresetClick = (preset) => {
    setActivePreset(preset.value);
    
    if (preset.value === 'Custom range') {
      setIsOpen(true);
    } else {
      const dates = getPresetDates(preset.value);
      if (dates) {
        setStartDate(dates.startDate);
        setEndDate(dates.endDate);
        setTempStartDate(dates.startDate);
        setTempEndDate(dates.endDate);
        setShowError(null);
        setIsOpen(false);
        if (onDateRangeChange) {
          onDateRangeChange({ startDate: dates.startDate, endDate: dates.endDate });
        }
      }
    }
  };

  const handleDateSelect = (date) => {
    if (isFutureDate(date)) {
      setShowError("Future dates not allowed");
      return;
    }
    
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new range
      setTempStartDate(date);
      setTempEndDate(null);
      setShowError(null);
    } else if (tempStartDate && !tempEndDate) {
      // Set end date
      if (isDateBefore(date, tempStartDate)) {
        setShowError("End date must be after start date");
        // We could alternatively reset start date here, but error is requested
      } else {
        setTempEndDate(date);
        setShowError(null);
      }
    }
  };

  const handleApply = () => {
    if (!tempStartDate || !tempEndDate) {
      setShowError("Please select a complete date range");
      return;
    }
    if (isDateBefore(tempEndDate, tempStartDate)) {
      setShowError("End date must be after start date");
      return;
    }
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setIsOpen(false);
    if (onDateRangeChange) {
      onDateRangeChange({ startDate: tempStartDate, endDate: tempEndDate });
    }
  };

  const handleCancel = () => {
    // Revert to last applied
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowError(null);
    setIsOpen(false);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null);
    setTempEndDate(null);
    setActivePreset('Custom range');
    if (onDateRangeChange) {
      onDateRangeChange({ startDate: null, endDate: null });
    }
  };

  const handleManualDateChange = (date, type) => {
    setActivePreset('Custom range');
    setShowError(null);
    
    if (type === 'start') {
      if (date && tempEndDate && isDateBefore(tempEndDate, date)) {
         setShowError("Start date must be before end date");
      }
      setTempStartDate(date);
    } else {
      if (date && tempStartDate && isDateBefore(date, tempStartDate)) {
         setShowError("End date must be after start date");
      }
      setTempEndDate(date);
    }
  };

  return (
    <div className="w-full space-y-4" ref={containerRef}>
      
      {/* Active Range Pill Display */}
      {startDate && endDate && !isOpen && (
        <div className="flex justify-start">
           <RangePill 
             startDate={startDate} 
             endDate={endDate} 
             onClear={handleClear} 
             onClick={() => setIsOpen(true)} 
           />
        </div>
      )}

      {/* Main interaction area */}
      <div className="flex flex-col xl:flex-row gap-4 xl:items-start w-full relative">
        
        {/* Preset Buttons */}
        <div className="w-full xl:w-2/3">
          <PresetButtons 
            presets={PRESETS} 
            activePreset={activePreset} 
            onPresetClick={handlePresetClick} 
          />
        </div>

        {/* Inputs & Dropdown Container */}
        <div className="w-full xl:w-1/3 flex flex-col sm:flex-row gap-2 relative">
          <DateInputField 
            label="Start Date"
            value={tempStartDate}
            onChange={(d, err) => {
              if(err) setShowError(err);
              else handleManualDateChange(d, 'start');
            }}
            onFocus={() => setIsOpen(true)}
            error={showError?.includes('Start') ? showError : null}
          />
          <DateInputField 
            label="End Date"
            value={tempEndDate}
            onChange={(d, err) => {
              if(err) setShowError(err);
              else handleManualDateChange(d, 'end');
            }}
            onFocus={() => setIsOpen(true)}
            error={showError?.includes('End') ? showError : null}
          />

          {isDesktop && (
            <CalendarPopup 
              isOpen={isOpen}
              tempStartDate={tempStartDate}
              tempEndDate={tempEndDate}
              onDateSelect={handleDateSelect}
              onApply={handleApply}
              onCancel={handleCancel}
              showError={showError}
            />
          )}
        </div>
      </div>

      {!isDesktop && (
        <BottomSheet 
          isOpen={isOpen}
          tempStartDate={tempStartDate}
          tempEndDate={tempEndDate}
          onDateSelect={handleDateSelect}
          onApply={handleApply}
          onCancel={handleCancel}
          showError={showError}
        />
      )}
      
    </div>
  );
}