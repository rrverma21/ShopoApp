import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SellerRegistrationForm from '@/components/auth/SellerRegistrationForm';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ============================================================================
 * EMAIL CONFIRMATION CONFIGURATION GUIDE (FOR DEVELOPERS / ADMINS)
 * ============================================================================
 * 
 * If confirmation emails are not being sent, verify the following in your 
 * Supabase Project Dashboard:
 * 
 * 1. ENABLE EMAIL CONFIRMATIONS:
 *    Go to Authentication -> Providers -> Email.
 *    Ensure "Confirm email" is ENABLED. Without this, users are auto-verified.
 * 
 * 2. CONFIGURE REDIRECT URLS:
 *    Go to Authentication -> URL Configuration.
 *    Add your production URL (and localhost for dev) to the "Redirect URLs" list.
 *    (e.g., http://localhost:5173/verified, https://yourdomain.com/verified)
 * 
 * 3. CUSTOMIZE EMAIL TEMPLATE:
 *    Go to Authentication -> Email Templates -> "Confirm signup".
 *    Use this sample template to brand your email with proper links:
 *    -------------------------------------------------------------------------
 *    Subject: Confirm Your Seller Account at Shopo
 *    Body (HTML):
 *    <h2>Welcome to Shopo!</h2>
 *    <p>Hi {{ .Data.full_name }},</p>
 *    <p>Thank you for registering as a seller. Please confirm your email address by clicking the link below:</p>
 *    <p><a href="{{ .ConfirmationURL }}">Confirm My Account</a></p>
 *    <p>If you did not request this, please ignore this email.</p>
 *    -------------------------------------------------------------------------
 * 
 * 4. SMTP SETTINGS (For Production Delivery):
 *    By default, Supabase uses a rate-limited shared email service that may silently fail or drop emails in production.
 *    Go to Project Settings -> SMTP to configure a custom SMTP provider
 *    (like Resend, SendGrid, AWS SES) for reliable production delivery.
 * ============================================================================
 */

const SellerSignupPage = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    referredByCode: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const processReferral = async (newUserId, referralCode) => {
    if (!referralCode) return;
    try {
        const { data: referrer, error: refError } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (refError || !referrer) return;

        await supabase
            .from('referrals')
            .insert({
                referrer_id: referrer.id,
                referred_user_id: newUserId,
                referral_code: referralCode,
                status: 'pending'
            });
    } catch (e) {
        console.error("Referral processing error:", e);
    }
  };

  const handleAccountCreation = async (data) => {
    setLoading(true);
    
    try {
      // 1. Call Supabase Auth SignUp
      // The emailRedirectTo option is CRITICAL here so that the confirmation 
      // link sent in the email directs the user back to our VerifiedPage.
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            businessName: data.fullName,
            phone: data.phoneNumber,
            role: 'seller',
            referred_by_code: data.referredByCode || null
          },
          emailRedirectTo: `${window.location.origin}/verified`
        }
      });

      if (error) throw error;

      // Check if email confirmation is required based on response
      const requiresEmailConfirmation = authData?.user && authData?.user?.identities?.length > 0 && !authData?.session;

      if (authData?.user && data.referredByCode) {
        await processReferral(authData.user.id, data.referredByCode);
      }

      if (requiresEmailConfirmation) {
         setStep(2); 
      } else {
         // Auto-login (if confirm email is turned off in Supabase)
         toast({ title: 'Welcome!', description: 'Account created successfully.' });
         navigate('/pos/point-of-sale');
      }
      
    } catch (error) {
      toast({
        title: 'Registration Error',
        description: error.message || 'Account creation failed. Please try again.',
        variant: 'destructive'
      });
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <Helmet>
        <title>Seller Registration | Shopo</title>
        <meta name="description" content="Join Shopo as a seller" />
      </Helmet>

      <div className="mb-8 text-center">
        <Link to="/" className="inline-block">
          <img 
            src="https://horizons-cdn.hostinger.com/3c38fd60-a24a-4d78-a3d8-58678655dafd/a7b90c40bcf1c912ebc37808895f8526.png" 
            alt="ShopoApp Logo" 
            className="h-12 w-auto mx-auto object-contain" 
          />
        </Link>
      </div>

      <div className="w-full max-w-md">
        {step === 1 && (
          <SellerRegistrationForm 
            formData={formData} 
            setFormData={setFormData} 
            onNext={handleAccountCreation} 
          />
        )}
        
        {step === 2 && (
          <Card className="w-full max-w-md mx-auto text-center border-border bg-card text-card-foreground p-8 shadow-xl">
            <CardContent className="space-y-4 flex flex-col items-center justify-center pt-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold">Check your email</h3>
              <p className="text-muted-foreground">
                We've sent a confirmation link to <strong>{formData.email}</strong>. 
                Please click the link to verify your email address and activate your account.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                 If you don't see it, please check your spam folder.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full mt-4" variant="outline">
                Return to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerSignupPage;