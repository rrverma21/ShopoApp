import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import PhoneInput from './PhoneInput';
import PincodePostcodeInput from './PincodePostcodeInput';
import StateCountySelect from './StateCountySelect';
import { useRegion } from '@/contexts/RegionContext';
import { validateIndianPhone, validateUKPhone, validateIndianPincode, validateUKPostcode } from '@/utils/addressValidation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AddressForm = ({ onSubmit, initialData = {}, title = "Delivery Address", description = "Enter your complete address details" }) => {
  const { currentRegion } = useRegion();
  const { toast } = useToast();
  const isIndia = currentRegion === 'India';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const defaultCountry = isIndia ? 'India' : 'United Kingdom';

  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      streetAddress: initialData.streetAddress || '',
      city: initialData.city || '',
      state: initialData.state || '',
      pincode: initialData.pincode || '',
      phone: initialData.phone || '',
      country: initialData.country || defaultCountry
    }
  });

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setIsSuccess(true);
      toast({
        title: 'Success',
        description: 'Address has been saved successfully.',
      });
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save address',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="streetAddress" className={errors.streetAddress ? 'text-red-500' : ''}>
              Street Address <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="streetAddress"
              control={control}
              rules={{ required: 'Street address is required' }}
              render={({ field }) => (
                <Input 
                  {...field} 
                  placeholder="House number, building, street, area" 
                  className={errors.streetAddress ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
              )}
            />
            {errors.streetAddress && <p className="text-xs text-red-500">{errors.streetAddress.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className={errors.city ? 'text-red-500' : ''}>
                City/Town <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="city"
                control={control}
                rules={{ required: 'City is required' }}
                render={({ field }) => (
                  <Input 
                    {...field} 
                    placeholder="City or Town" 
                    className={errors.city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                )}
              />
              {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
            </div>

            <Controller
              name="state"
              control={control}
              rules={{ required: isIndia ? 'State is required' : false }}
              render={({ field }) => (
                <StateCountySelect 
                  {...field} 
                  required={isIndia} 
                  error={errors.state?.message} 
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="pincode"
              control={control}
              rules={{ 
                required: isIndia ? 'Pincode is required' : 'Postcode is required',
                validate: value => isIndia 
                  ? validateIndianPincode(value) || 'Must be 6 digits' 
                  : validateUKPostcode(value) || 'Invalid UK postcode'
              }}
              render={({ field }) => (
                <PincodePostcodeInput 
                  {...field} 
                  required 
                  error={errors.pincode?.message} 
                />
              )}
            />

            <Controller
              name="phone"
              control={control}
              rules={{ 
                required: 'Phone number is required',
                validate: value => isIndia 
                  ? validateIndianPhone(value) || 'Must be 10 digits' 
                  : validateUKPhone(value) || 'Invalid UK phone number'
              }}
              render={({ field }) => (
                <PhoneInput 
                  {...field} 
                  required 
                  error={errors.phone?.message} 
                />
              )}
            />
          </div>

          <div className="space-y-2 opacity-70 cursor-not-allowed">
            <Label>Country</Label>
            <Input disabled value={defaultCountry} />
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50 dark:bg-slate-900/50 rounded-b-lg py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button type="submit" disabled={isSubmitting || isSuccess} className="w-full sm:w-auto min-w-[120px]">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : isSuccess ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
            ) : (
              'Save Address'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AddressForm;