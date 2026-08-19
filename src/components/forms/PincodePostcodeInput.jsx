import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegion } from '@/contexts/RegionContext';
import { validateIndianPincode, validateUKPostcode } from '@/utils/addressValidation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { PINCODE_FORMATS } from '@/constants/regions';

const PincodePostcodeInput = React.forwardRef(({ value, onChange, onBlur, name, error: externalError, required = false, className = '' }, ref) => {
  const { currentRegion } = useRegion();
  const [internalError, setInternalError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const isIndia = currentRegion === 'India';
  const label = PINCODE_FORMATS[isIndia ? 'India' : 'UK'].name;
  const placeholder = `e.g., ${PINCODE_FORMATS[isIndia ? 'India' : 'UK'].example}`;

  useEffect(() => {
    if (value) {
      const valid = isIndia ? validateIndianPincode(value) : validateUKPostcode(value);
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
      const valid = isIndia ? validateIndianPincode(val) : validateUKPostcode(val);
      if (!valid) {
        setInternalError(isIndia ? 'Pincode must be 6 digits' : 'Enter a valid UK postcode');
      } else {
        setInternalError('');
      }
    } else if (required) {
      setInternalError(`${label} is required`);
    }
    if (onBlur) onBlur(e);
  };

  const handleChange = (e) => {
    let val = e.target.value;
    if (isIndia) {
      val = val.replace(/\D/g, '').slice(0, 6);
    } else {
      val = val.toUpperCase().slice(0, 8);
    }
    if (onChange) {
      const event = { ...e, target: { ...e.target, value: val, name } };
      onChange(event);
    }
  };

  const displayError = externalError || internalError;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name} className={displayError ? 'text-red-500' : ''}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          ref={ref}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${displayError ? 'border-red-500 focus-visible:ring-red-500' : isValid ? 'border-green-500' : ''}`}
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

PincodePostcodeInput.displayName = 'PincodePostcodeInput';

export default PincodePostcodeInput;