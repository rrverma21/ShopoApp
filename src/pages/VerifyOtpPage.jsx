import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const VerifyOtpPage = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const phone = location.state?.phone;
  const email = location.state?.email;

  useEffect(() => {
    if (!phone) {
      toast({
        title: 'Invalid State',
        description: 'Missing phone number for verification. Please start over.',
        variant: 'destructive',
      });
      navigate('/signup');
    }
  }, [phone, navigate, toast]);

  if (!phone) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Validate custom OTP stored in the database
      const { data: verificationData, error: dbError } = await supabase
          .from('customer_verifications')
          .select('*')
          .eq('phone', phone)
          .single();

      if (dbError || !verificationData) {
          throw new Error('OTP record not found. Please request a new code.');
      }

      if (verificationData.otp_code !== otp) {
          throw new Error('Incorrect OTP code provided.');
      }

      if (new Date(verificationData.expires_at) < new Date()) {
          throw new Error('Your OTP has expired. Please request a new one.');
      }

      // 2. Mark phone as verified in user profile
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
         await supabase.from('profiles').update({ phone_verified: true }).eq('id', user.id);
      } else {
         // Fallback if not strictly logged in yet
         await supabase.from('profiles').update({ phone_verified: true }).eq('phone', phone);
      }

      // 3. Clear the OTP so it can't be reused
      await supabase.from('customer_verifications').delete().eq('phone', phone);

      toast({
        title: 'Verification Successful!',
        description: 'Your phone number has been verified. You can now log in.',
      });
      navigate('/login');
      
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
        // 1. Generate a new custom 6-digit OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 min expiry
        
        // 2. Upsert it into the database
        const { error: dbError } = await supabase
            .from('customer_verifications')
            .upsert(
                { phone: phone, otp_code: newOtp, expires_at: expiresAt }, 
                { onConflict: 'phone' }
            );
            
        if (dbError) throw dbError;

        // 3. Invoke Edge Function to dispatch SMS securely
        const { data, error: fnError } = await supabase.functions.invoke('send-otp', {
            body: { phone: phone, otp: newOtp }
        });

        if (fnError) {
             console.error("Failed to invoke edge function:", fnError);
             throw new Error("Could not send SMS at this time. Please try again later.");
        }

        if (data && data.success === false) {
             throw new Error(data.error || "Failed to send SMS via provider.");
        }

        if (data?.dev_otp && import.meta.env.DEV) {
            toast({
              title: "OTP Resent (Dev Mode)",
              description: `Your code is ${data.dev_otp}. Sent to ******${phone.slice(-4)}`,
              duration: 8000
            });
        } else {
            toast({
                title: 'OTP Resent',
                description: `A new OTP has been sent to your phone number ending in ******${phone.slice(-4)}.`,
            });
        }
    } catch (error) {
        toast({
            title: 'Failed to Resend OTP',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Verify Phone Number - ShopoApp</title>
        <meta name="description" content="Verify your phone number to complete your registration." />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8"
        >
          <h1 className="text-3xl font-bold mb-2 gradient-text">Verify Your Phone</h1>
          <p className="text-slate-600 mb-8">An OTP has been sent to ******{phone.slice(-4)}. Please enter it below to verify your phone number.</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="otp">One-Time Password (OTP)</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                pattern="\d{6}"
                title="Please enter exactly 6 digits"
              />
            </div>
            <Button type="submit" className="w-full btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Phone Number'}
            </Button>
          </form>
          <div className="text-center mt-4">
            <Button variant="link" onClick={handleResendOtp} disabled={loading} className="text-blue-600 hover:text-blue-800">
              Didn't receive the code? Resend OTP
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default VerifyOtpPage;