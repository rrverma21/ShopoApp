import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { User, Store, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle, Shield, CreditCard } from 'lucide-react';
import { getReferrerByCode, createReferralLinkage } from '@/services/referralService';
import { COUNTRIES } from '@/constants/countries';

// Local mapping for common country dial codes to enable sync
// In a full production app, this would be an exhaustive list imported from a constant
const DIAL_CODES = {
  "India": { code: "IN", dialCode: "+91" },
  "United States of America": { code: "US", dialCode: "+1" },
  "United Kingdom": { code: "GB", dialCode: "+44" },
  "Canada": { code: "CA", dialCode: "+1" },
  "Australia": { code: "AU", dialCode: "+61" },
  "Germany": { code: "DE", dialCode: "+49" },
  "France": { code: "FR", dialCode: "+33" },
  "United Arab Emirates": { code: "AE", dialCode: "+971" },
  "Singapore": { code: "SG", dialCode: "+65" },
  "South Africa": { code: "ZA", dialCode: "+27" },
  "New Zealand": { code: "NZ", dialCode: "+64" },
  "Brazil": { code: "BR", dialCode: "+55" },
  "Mexico": { code: "MX", dialCode: "+52" }
};

// Generate a master list pairing all COUNTRIES with their dial codes (with a fallback)
const getCountryOptions = () => {
  return COUNTRIES.map(countryName => {
    const mapping = DIAL_CODES[countryName];
    return {
      name: countryName,
      code: mapping ? mapping.code : countryName.substring(0, 2).toUpperCase(),
      dialCode: mapping ? mapping.dialCode : "+00" // Fallback dial code
    };
  });
};

const COUNTRY_OPTIONS = getCountryOptions();

const SignupPage = () => {
  const [role, setRole] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', 
    country: '', phoneCountryCode: '', phoneNumber: '', 
    password: '', confirmPassword: '',
    streetAddress: '', city: '', state: '', pincode: '', businessName: '', referralCode: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralInfo, setReferralInfo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) checkReferral(refCode);
  }, [location]);

  const checkReferral = async (code) => {
    try {
      const referrerId = await getReferrerByCode(code);
      if (referrerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', referrerId)
          .single();
          
        const businessName = profile?.business_name || 'a member';
        setReferralInfo({ id: referrerId, referral_code: code, business_name: businessName });
        setFormData(prev => ({ ...prev, referralCode: code }));
        toast({ title: "Referral Applied!", description: `You're joining via ${businessName}'s link.` });
      }
    } catch (err) {
      console.error("Error fetching referral:", err);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === 'referralCode') {
      setFormData({ ...formData, [id]: value.toUpperCase() });
    } else if (id === 'phoneNumber') {
      // Allow only numbers and spaces/hyphens
      const cleaned = value.replace(/[^\d\s-]/g, '');
      setFormData({ ...formData, [id]: cleaned });
    } else {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleCountryChange = (countryName) => {
    const matchingOption = COUNTRY_OPTIONS.find(opt => opt.name === countryName);
    setFormData(prev => ({ 
      ...prev, 
      country: countryName,
      phoneCountryCode: matchingOption ? matchingOption.dialCode : prev.phoneCountryCode 
    }));
  };

  const handlePhoneCodeChange = (dialCode) => {
    // Find the first country that matches this dial code to sync the main country dropdown
    const matchingOption = COUNTRY_OPTIONS.find(opt => opt.dialCode === dialCode);
    setFormData(prev => ({
      ...prev,
      phoneCountryCode: dialCode,
      country: matchingOption && !prev.country ? matchingOption.name : prev.country // Only auto-set country if it's empty to avoid overriding user intention if multiple countries share a code
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({ title: "Name Required", description: "Please enter both First Name and Last Name.", variant: "destructive" });
      return;
    }
    
    if (!formData.country) {
      toast({ title: "Country Required", description: "Please select your country.", variant: "destructive" });
      return;
    }

    if (!formData.phoneNumber.trim() || !formData.phoneCountryCode) {
      toast({ title: "Phone Required", description: "Please enter a valid phone number and country code.", variant: "destructive" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords Mismatch", description: "Your passwords do not match.", variant: "destructive" });
      return;
    }

    if (!agreedToTerms) {
      toast({ title: "Agreement Required", description: "You must agree to Terms & Conditions.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let finalReferralId = referralInfo?.id;

    try {
      // Validate manually entered referral code if it differs from the URL one
      if (formData.referralCode && (!referralInfo || referralInfo.referral_code !== formData.referralCode)) {
        const referrerId = await getReferrerByCode(formData.referralCode);
        if (referrerId) {
          finalReferralId = referrerId;
        } else {
          toast({ title: "Invalid Referral Code", description: "The referral code you entered is invalid.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const fullPhone = `${formData.phoneCountryCode} ${formData.phoneNumber.trim()}`;

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            country: formData.country,
            businessName: formData.businessName || fullName,
            phone: fullPhone,
            streetAddress: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            role: role || 'customer'
          },
        }
      });

      if (error) throw error;

      if (data.user && finalReferralId) {
        await createReferralLinkage(finalReferralId, data.user.id, formData.referralCode);
      }

      toast({ title: "Account Created!", description: "Please check your email for verification." });
      navigate('/login');
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Create unique dial codes for the dropdown to avoid duplicate +1s etc if mapping gets large
  const uniqueDialCodes = Array.from(new Set(COUNTRY_OPTIONS.map(opt => opt.dialCode)))
    .map(code => COUNTRY_OPTIONS.find(opt => opt.dialCode === code));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Helmet>
        <title>ShopoApp | Create Account</title>
        <meta name="description" content="Create ShopoApp Account - Start managing your retail business today." />
      </Helmet>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row">
        {/* Left Info Panel */}
        <div className="md:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-4">Start your journey.</h2>
          <p className="text-slate-400 mb-8">Access professional tools for retail management and distribution.</p>
          
          {/* Trust Badges Section */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl">
              <CheckCircle className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
              <span className="text-slate-100 font-medium text-sm md:text-base">30 Days Free Trial</span>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl">
              <CreditCard className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
              <span className="text-slate-100 font-medium text-sm md:text-base">No Credit Card Required</span>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl">
              <Shield className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
              <span className="text-slate-100 font-medium text-sm md:text-base">Cancel Anytime</span>
            </div>
          </div>

          {referralInfo && (
            <div className="bg-blue-500/20 border border-blue-500/30 p-4 rounded-xl mt-auto">
              <p className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-1">Referral Reward Active</p>
              <p className="text-white text-xs">You were invited by <strong>{referralInfo.business_name}</strong>.</p>
            </div>
          )}
        </div>

        {/* Right Form Panel */}
        <div className="md:w-2/3 p-8">
          {!role ? (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Choose your path</h3>
              <div className="grid gap-4">
                <button onClick={() => setRole('customer')} className="flex items-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left group">
                  <User className="w-10 h-10 text-primary mr-4 group-hover:scale-110 transition-transform" />
                  <div><p className="font-bold text-slate-900 dark:text-white">Customer</p><p className="text-sm text-slate-500 dark:text-slate-400">I want to buy products</p></div>
                </button>
                <button onClick={() => setRole('seller')} className="flex items-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left group">
                  <Store className="w-10 h-10 text-primary mr-4 group-hover:scale-110 transition-transform" />
                  <div><p className="font-bold text-slate-900 dark:text-white">Shop / Business Owners</p><p className="text-sm text-slate-500 dark:text-slate-400">I want to sell products</p></div>
                </button>
              </div>
              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account? <Link to="/login" className="text-primary hover:underline font-semibold">Log in</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <Button type="button" variant="ghost" onClick={() => setRole(null)} className="h-8 px-2 text-slate-500"><ArrowLeft className="w-4 h-4 mr-2"/> Back</Button>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase">
                  {role === 'customer' ? 'CUSTOMER DETAILS' : role === 'seller' ? 'SELLER DETAILS' : `Registering as ${role}`}
                </span>
              </div>
              
              {/* Row 1: First Name & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} required placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} required placeholder="Doe" />
                </div>
              </div>

              {/* Row 2: Country & Phone Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={formData.country} onValueChange={handleCountryChange} required>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px] overflow-y-auto overflow-x-hidden z-[100] custom-scrollbar">
                      {COUNTRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.name} value={opt.name}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-[120px] shrink-0">
                      <Select value={formData.phoneCountryCode} onValueChange={handlePhoneCodeChange} required>
                        <SelectTrigger id="phoneCountryCode" aria-label="Country Code">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[300px] overflow-y-auto overflow-x-hidden z-[100] custom-scrollbar">
                          {uniqueDialCodes.map((opt) => (
                            <SelectItem key={`code-${opt.code}-${opt.dialCode}`} value={opt.dialCode}>
                              {opt.code} {opt.dialCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input 
                      id="phoneNumber" 
                      name="phoneNumber" 
                      autoComplete="tel-national" 
                      value={formData.phoneNumber} 
                      onChange={handleChange} 
                      required 
                      placeholder="98765 43210" 
                      className="flex-grow"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required placeholder="john.doe@example.com" />
              </div>
              
              {/* Row 4: Referral Code */}
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code <span className="text-slate-500 font-normal text-xs">(Optional)</span></Label>
                <Input 
                  id="referralCode" 
                  name="referralCode"
                  value={formData.referralCode} 
                  onChange={handleChange} 
                  placeholder="e.g., CUST792883" 
                  className="uppercase tracking-widest"
                />
              </div>

              {/* Row 5: Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      name="password"
                      autoComplete="new-password"
                      type={showPassword ? 'text' : 'password'} 
                      value={formData.password} 
                      onChange={handleChange} 
                      required 
                      placeholder="••••••••" 
                      className="pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword" 
                      name="confirmPassword"
                      autoComplete="new-password"
                      type={showConfirmPassword ? 'text' : 'password'} 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      required 
                      placeholder="••••••••" 
                      className="pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 6: Terms & Conditions Checkbox */}
              <div className="flex items-center space-x-2 mt-4 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms} 
                  onCheckedChange={(checked) => setAgreedToTerms(checked)} 
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300"
                >
                  I agree to the <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Terms & Conditions</Link>
                </Label>
              </div>

              {/* Row 7: Submit Button */}
              <Button type="submit" variant="primary" className="w-full mt-6" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Details...</> : "Submit Details"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
