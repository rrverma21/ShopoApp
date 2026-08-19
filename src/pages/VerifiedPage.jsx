import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

const VerifiedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resendVerificationEmail } = useAuth();

  const [status, setStatus] = useState('loading'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const hasAttemptedVerification = useRef(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (hasAttemptedVerification.current) return;
      hasAttemptedVerification.current = true;

      const searchParams = new URLSearchParams(location.search);
      let token = searchParams.get('token');

      // Supabase Email confirmation handles URL generation depending on the settings.
      // E.g., it might use #access_token=...&type=signup or ?token=...&type=signup
      if (!token && location.hash) {
         const hashParams = new URLSearchParams(location.hash.substring(1));
         token = hashParams.get('access_token');
         
         if (token) {
             // If access_token exists, the user is effectively verified and logged in.
             setStatus('success');
             return;
         }
      }

      if (!token) {
        const errorDesc = searchParams.get('error_description');
        if (errorDesc) {
            setStatus('error');
            setErrorMessage(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
            return;
        }
        
        setStatus('error');
        setErrorMessage('Verification token is missing from the URL. Please check the link from your email.');
        return;
      }

      try {
        // Manually verify OTP if token was provided in the query params.
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });

        if (error) {
          throw error;
        }

        setStatus('success');
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'The verification link is invalid or has expired.');
      }
    };

    verifyToken();
  }, [location.search, location.hash]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Email required', description: 'Please enter your email address to resend the link.', variant: 'destructive' });
      return;
    }

    setResending(true);
    try {
      await resendVerificationEmail(email);
      toast({
        title: 'Email Sent',
        description: 'A new verification link has been sent to your email address.',
      });
      setEmail('');
    } catch (err) {
      toast({
        title: 'Failed to resend',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Email Verification | Shopo</title>
        <meta name="description" content="Verify your email address to continue." />
      </Helmet>
      
      <div className="min-h-[80vh] flex items-center justify-center bg-transparent p-4 w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl overflow-hidden p-8 md:p-10 border border-border text-center mx-auto"
        >
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <h2 className="text-2xl font-bold mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="verification-success-box py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
                <CheckCircle className="h-20 w-20 text-green-500 mb-6 mx-auto" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-3">Email Verified!</h2>
              <p className="text-green-800 dark:text-green-200 mb-8 text-lg">
                Your email has been verified successfully. You can now log in to your account.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 shadow-md">
                Go to Login <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="verification-error-box py-6">
              <XCircle className="h-16 w-16 text-red-500 mb-4 mx-auto" />
              <h2 className="text-2xl font-bold mb-2 text-red-700 dark:text-red-400">Verification Failed</h2>
              <div className="bg-red-100/50 border border-red-200/50 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-6 w-full text-sm">
                {errorMessage}
              </div>
              
              <div className="w-full border-t border-red-200/30 dark:border-red-900/30 pt-6 mt-2 text-left">
                <h3 className="font-semibold mb-4 text-center text-foreground">Request a new verification link</h3>
                <form onSubmit={handleResend} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your@email.com" 
                        className="pl-10 h-11 bg-background text-foreground"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="outline" className="w-full h-11 bg-background text-foreground hover:bg-muted" disabled={resending}>
                    {resending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    + Resend verification email
                  </Button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default VerifiedPage;