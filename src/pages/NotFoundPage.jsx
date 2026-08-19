import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
      </Helmet>
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-slate-200">404</h1>
        <div className="-mt-12 relative z-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Page Not Found</h2>
          <p className="text-slate-600 mb-8">
            Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/">
              <Button className="btn-primary">
                <Home className="w-4 h-4 mr-2" /> Back Home
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;