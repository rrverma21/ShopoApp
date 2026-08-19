import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegion } from '@/contexts/RegionContext';
import { validateIndianPhone, validateUKPhone } from '@/utils/addressValidation';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const PhoneInput = React.forwardRef(({ value, onChange, onBlur, name, error: externalError, required = false, className = '' }, ref) => {
  const { currentRegion } = useRegion();
  const [internalError, setInternalError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const isIndia = currentRegion === 'India';
  const label = 'Phone Number';
  const placeholder = isIndia ? 'e.g., 9876543210' : 'e.g., 020 7183 8750';

  useEffect(() => {
    if (value) {
      const valid = isIndia ? validateIndianPhone(value) : validateUKPhone(value);
      setIsValid(valid);
      if (valid) setInternalError('');
    } else {
      setIsValid(false);
      setInternalError('');
    }
  }, [value, currentRegion, isIndia]);

  const handleBlur = (e) => {
    const val = e.target.value;
    if (val) {
      const valid = isIndia ? validateIndianPhone(val) : validateUKPhone(val);
      if (!valid) {
        setInternalError(isIndia ? 'Phone number must be 10 digits' : 'Enter a valid UK phone number');
      } else {
        setInternalError('');
      }
    } else if (required) {
      setInternalError('Phone number is required');
    }
    if (onBlur) onBlur(e);
  };

  const displayError = externalError || internalError;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name} className={displayError ? 'text-red-500' : ''}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500 font-medium">
          {isIndia ? '+91' : '+44'}
        </div>
        <Input
          id={name}
          name={name}
          ref={ref}
          value={value || ''}
          onChange={onChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`pl-12 ${displayError ? 'border-red-500 focus-visible:ring-red-500' : isValid ? 'border-green-500' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {displayError ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : isValid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      </div>
      {displayError && (
        <p className="text-xs text-red-500 mt-1">{displayError}</p>
      )}
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;