import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRegion } from '@/contexts/RegionContext';
import { INDIAN_STATES, UK_REGIONS } from '@/constants/regions';

const StateCountySelect = React.forwardRef(({ value, onChange, onBlur, name, error, required = false, className = '' }, ref) => {
  const { currentRegion } = useRegion();
  const isIndia = currentRegion === 'India';
  const label = isIndia ? 'State' : 'County/Region';
  const options = isIndia ? INDIAN_STATES : UK_REGIONS;

  const displayRequired = isIndia ? true : required;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name} className={error ? 'text-red-500' : ''}>
        {label} {displayRequired && <span className="text-red-500">*</span>}
      </Label>
      <Select 
        value={value || ''} 
        onValueChange={(val) => {
          if (onChange) onChange({ target: { name, value: val }});
        }}
      >
        <SelectTrigger 
          id={name}
          ref={ref} 
          onBlur={onBlur}
          className={error ? 'border-red-500 focus:ring-red-500' : ''}
        >
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
});

StateCountySelect.displayName = 'StateCountySelect';

export default StateCountySelect;