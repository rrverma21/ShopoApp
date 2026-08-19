import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleOAuth } from '@/hooks/useGoogleOAuth';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const GoogleOAuthCallback = () => {
  const navigate = useNavigate();
  const { handleCallback } = useGoogleOAuth();
  const { refreshUserProfile } = useAuth();
  
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [errorMessage, setErrorMessage] = useState(null);
  
  const processedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        const user = await handleCallback();
        
        if (user) {
          setStatus('success');
          await refreshUserProfile(); 
          // Small delay for user to see success state
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          // handleCallback returns null on error but sets its internal error state.
          // However, we want to catch it here if possible or use the hook's error.
          // Since we are inside the effect, relying on the hook's state might be tricky due to closures.
          // Let's rely on the fact that handleCallback usually throws or returns null.
          setStatus('error');
          setErrorMessage("Authentication sequence failed. Please try again.");
        }
      } catch (err) {
        console.error("Callback processing error:", err);
        setStatus('error');
        setErrorMessage(err.message || "An unexpected error occurred during login.");
      }
    };

    processCallback();
  }, [handleCallback, navigate, refreshUserProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-blue-600">
        <CardHeader className="text-center pb-2">
          <CardTitle>Google Authentication</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center py-6">
          
          {status === 'processing' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin relative z-10" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mt-6">Verifying Credentials...</h2>
              <p className="text-slate-500 mt-2 max-w-xs">Please wait while we securely exchange tokens with Google and setup your session.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <div className="h-8 w-8 bg-green-500 rounded-full"></div>
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Login Successful!</h2>
              <p className="text-slate-500 mt-2">Redirecting you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Authentication Failed</h2>
              <div className="bg-red-50 border border-red-100 p-3 rounded-md mt-4 w-full text-left">
                <p className="text-xs font-bold text-red-800 uppercase mb-1">Error Details:</p>
                <p className="text-sm text-red-700 font-mono break-words">{errorMessage}</p>
              </div>
            </>
          )}
        </CardContent>
        
        {status === 'error' && (
          <CardFooter className="flex justify-center gap-3 bg-slate-50/50 p-4">
            <Button onClick={() => navigate('/login')} variant="outline" className="gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to Login
            </Button>
            <Button onClick={() => window.location.reload()} variant="default" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default GoogleOAuthCallback;