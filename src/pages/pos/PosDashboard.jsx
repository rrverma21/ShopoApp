import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from '@/components/pos/Sidebar';
import PremiumPosGuide from '@/components/pos/PremiumPosGuide';

const PosDashboard = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [runGuide, setRunGuide] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('posGuideSeen');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        setRunGuide(true);
        localStorage.setItem('posGuideSeen', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleStartGuide = () => {
    setRunGuide(true);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false); 
    }
  };

  const handleSetRunGuide = (val) => {
    setRunGuide(val);
  };

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden relative">
      <Helmet>
        <title>POS Dashboard | Manage Your Store</title>
        <meta name="description" content="ShopoApp Point of Sale System Dashboard." />
      </Helmet>

      <PremiumPosGuide run={runGuide} setRun={handleSetRunGuide} />

      <aside className="w-64 hidden md:flex bg-slate-900 text-white border-r border-slate-800 z-10 shrink-0">
        <Sidebar onHelpClick={handleStartGuide} className="w-full" />
      </aside>

      <div className="md:hidden bg-slate-900 text-white flex justify-between items-center p-3 border-b border-slate-800 z-10 shrink-0">
        <span className="font-bold text-lg tracking-tight">ShopoApp POS</span>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-slate-900 text-white border-r border-slate-800">
            <Sidebar onHelpClick={handleStartGuide} className="w-full" />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 relative flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto w-full h-full relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PosDashboard;