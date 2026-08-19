import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { validateIndianPhone, validatePasswordStrength } from '@/lib/otpUtils';
import { supabase } from '@/lib/customSupabaseClient';

const SellerRegistrationForm = ({ formData, setFormData, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [referralValid, setReferralValid] = useState(null);

  const validateReferralCode = async (code) => {
    if (!code) {
      setReferralValid(null);
      setErrors(prev => ({ ...prev, referredByCode: '' }));
      return true;
    }

    setValidatingCode(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (error || !data) {
        setReferralValid(false);
        setErrors(prev => ({ ...prev, referredByCode: 'Invalid referral code.' }));
        return false;
      }

      setReferralValid(true);
      setErrors(prev => ({ ...prev, referredByCode: '' }));
      return true;
    } catch (err) {
      setReferralValid(false);
      setErrors(prev => ({ ...prev, referredByCode: 'Error validating code.' }));
      return false;
    } finally {
      setValidatingCode(false);
    }
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'fullName':
        if (!value || value.length < 2) error = 'Full Name is required (min 2 chars).';
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) error = 'Invalid email format.';
        break;
      case 'phoneNumber':
        if (!validateIndianPhone(value)) error = 'Only Indian mobile numbers (+91) are allowed.';
        break;
      case 'password':
        if (!validatePasswordStrength(value)) {
          error = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.';
        }
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
        } else {
          setErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) error = 'Passwords do not match.';
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'referredByCode') {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, [name]: upperValue }));
      setReferralValid(null);
      if (upperValue.length > 4) {
        validateReferralCode(upperValue);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      validateField(name, value);
    }
  };

  const isFormValid = () => {
    return (
      formData.fullName.length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      validateIndianPhone(formData.phoneNumber) &&
      validatePasswordStrength(formData.password) &&
      formData.password === formData.confirmPassword &&
      Object.entries(errors).every(([k, err]) => k === 'referredByCode' || err === '') &&
      (formData.referredByCode === '' || referralValid === true)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    if (formData.referredByCode && !referralValid) {
        const isValid = await validateReferralCode(formData.referredByCode);
        if (!isValid) return;
    }

    setLoading(true);
    try {
      await onNext(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card text-card-foreground border-border shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Seller Registration</CardTitle>
        <CardDescription>Enter your details to create a seller account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name / Business Name</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              className={errors.fullName ? 'border-destructive text-foreground' : 'text-foreground'}
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className={errors.email ? 'border-destructive text-foreground' : 'text-foreground'}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Mobile Number (+91)</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="9876543210"
              className={errors.phoneNumber ? 'border-destructive text-foreground' : 'text-foreground'}
            />
            {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referredByCode">Referral Code <span className="text-muted-foreground font-normal text-xs">(Optional)</span></Label>
            <div className="relative">
                <Input
                  id="referredByCode"
                  name="referredByCode"
                  value={formData.referredByCode || ''}
                  onChange={handleChange}
                  placeholder="e.g., CUST792883"
                  className={`uppercase text-foreground pr-10 tracking-widest ${errors.referredByCode ? 'border-destructive' : ''} ${referralValid ? 'border-green-500' : ''}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {validatingCode && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                    {!validatingCode && referralValid === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {!validatingCode && referralValid === false && formData.referredByCode?.length > 0 && <XCircle className="w-4 h-4 text-destructive" />}
                </div>
            </div>
            {errors.referredByCode && <p className="text-sm text-destructive">{errors.referredByCode}</p>}
            {referralValid && <p className="text-sm text-green-600 dark:text-green-400">Valid referral code applied!</p>}
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-destructive pr-10 text-foreground' : 'pr-10 text-foreground'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'border-destructive pr-10 text-foreground' : 'pr-10 text-foreground'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4" 
            disabled={!isFormValid() || loading || validatingCode}
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SellerRegistrationForm;