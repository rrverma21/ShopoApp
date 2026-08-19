import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LoadingFallback = ({ message = "Loading...", error = null }) => {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    // Set a timeout to show the retry button if loading takes too long (10 seconds)
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const isErrorState = !!error || showTimeout;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center h-full w-full">
      {!isErrorState ? (
        <>
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-medium animate-pulse">{message}</p>
        </>
      ) : (
        <div className="max-w-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 flex flex-col items-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
            {error ? "Initialization Error" : "Loading Timeout"}
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-6">
            {error 
              ? (error.message || "An error occurred while loading the application.")
              : "The application is taking longer than expected to load. Please check your connection and try again."}
          </p>
          <Button 
            onClick={handleRetry} 
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default LoadingFallback;