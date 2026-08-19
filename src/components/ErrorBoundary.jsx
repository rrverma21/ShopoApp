import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 w-full rounded-lg">
          <Card className="max-w-md w-full shadow-xl border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-950">
            <CardHeader className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/50 rounded-t-xl pb-4">
              <CardTitle className="flex items-center text-red-700 dark:text-red-400 gap-3 text-lg">
                <AlertTriangle className="h-6 w-6" />
                Component Failed to Load
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                We encountered an unexpected error while rendering this part of the application. This could be due to a network interruption or corrupted data.
              </p>
              
              {/* Task 7: Display appropriate error message, do not show blank screen */}
              {this.state.error && (
                <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md text-xs font-mono text-red-600 dark:text-red-400 overflow-auto max-h-32 border border-slate-200 dark:border-slate-800">
                  {this.state.error.toString()}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    if (this.props.onRetry) {
                        this.props.onRetry();
                    } else {
                        window.location.reload();
                    }
                  }}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Retry Loading
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;