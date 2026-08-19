import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MSG91OTPWidget = ({ phoneNumber, onSuccess, onFailure }) => {
  const [scriptStatus, setScriptStatus] = useState('loading'); // 'loading', 'ready', 'error'

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    const initWidget = async () => {
      try {
        setScriptStatus('loading');
        // Try primary URL
        try {
          await loadScript('https://verify.msg91.com/otp-provider.js');
        } catch (e) {
          // Try fallback URL
          await loadScript('https://verify.phone91.com/otp-provider.js');
        }

        setScriptStatus('ready');

        // Initialize MSG91 Widget
        if (window.initSendOTP) {
          window.initSendOTP({
            widgetId: "36636d665377363932343838",
            tokenAuth: "481035TjxE7ng0nCq69b3b447P1",
            identifier: phoneNumber,
            success: (data) => {
              if (onSuccess) onSuccess(data);
            },
            failure: (error) => {
              if (onFailure) onFailure(error);
            }
          });
        } else {
          throw new Error('initSendOTP is not defined on window object');
        }
      } catch (error) {
        console.error('Error loading MSG91 widget:', error);
        setScriptStatus('error');
        if (onFailure) onFailure(error);
      }
    };

    initWidget();

    return () => {
      // Cleanup scripts on unmount to prevent duplicates
      const scripts = document.querySelectorAll('script[src*="otp-provider.js"]');
      scripts.forEach(s => s.remove());
    };
  }, [phoneNumber, onSuccess, onFailure]);

  const handleRetry = () => {
    setScriptStatus('loading');
    // Force a re-render/re-run of useEffect by remounting or just reloading the page/state
    window.location.reload(); 
  };

  if (scriptStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-slate-500 text-sm">Loading secure verification...</p>
      </div>
    );
  }

  if (scriptStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
        <div className="bg-red-50 p-3 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Verification Unavailable</h3>
          <p className="text-slate-500 text-sm mt-1">We couldn't load the secure verification widget.</p>
        </div>
        <Button onClick={handleRetry} variant="outline" className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-green-50 p-4 rounded-full mb-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">Verification in Progress</h3>
      <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
        Please complete the verification process in the secure popup window.
      </p>
    </div>
  );
};

export default MSG91OTPWidget;