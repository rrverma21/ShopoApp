import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useMembership } from '@/contexts/MembershipContext';
import { supabase } from '@/lib/supabaseClient';
import { useWaterOrderNotifications } from '@/hooks/useWaterOrderNotifications';
import { useTodaysSalesTotal } from '@/hooks/useTodaysSalesTotal';
import { useTotalCredit } from '@/hooks/useTotalCredit';
import { useCurrentMonthSales } from '@/hooks/useCurrentMonthSales';
import { usePurchaseBillDue } from '@/hooks/usePurchaseBillDue';
import {
  ShoppingBag, Users, Settings, LogOut, BarChart2,
  DollarSign, Package, ListOrdered, ArrowRightLeft,
  ScanBarcode, Droplet, Home, Clock, ChevronDown, HelpCircle,
  FileText, Megaphone, Calculator, Briefcase, Loader2, Lock,
  LayoutDashboard
} from 'lucide-react';
import { cn, useCurrency, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BusinessInfoHeader from '@/components/pos/BusinessInfoHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Sidebar = ({ className, onHelpClick }) => {
  const { signOut, user } = useAuth();
  const { hasMembership } = useMembership();
  const location = useLocation();
  const navigate = useNavigate();
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const [pendingWaterOrdersCount, setPendingWaterOrdersCount] = useState(0);
  const [waterDeliveryEnabled, setWaterDeliveryEnabled] = useState(false);
  
  const { notifications } = useWaterOrderNotifications();
  const { symbol } = useCurrency();
  
  const { todaysSalesTotal, isLoading: isLoadingSales, error: salesError } = useTodaysSalesTotal();
  const prevSalesRef = useRef(todaysSalesTotal);
  const [animateBubble, setAnimateBubble] = useState(false);

  const { totalCredit, formattedCredit, isLoading: isCreditLoading, error: creditError } = useTotalCredit();
  const prevCreditRef = useRef(totalCredit);
  const [animateCreditBubble, setAnimateCreditBubble] = useState(false);

  const { currentMonthSales, formattedMonthSales, isLoading: isMonthSalesLoading, error: monthSalesError } = useCurrentMonthSales();
  const prevMonthSalesRef = useRef(currentMonthSales);
  const [animateMonthBubble, setAnimateMonthBubble] = useState(false);

  const { totalDue, formattedDue, isLoading: isDueLoading, error: dueError } = usePurchaseBillDue();
  const prevDueRef = useRef(totalDue);
  const [animateDueBubble, setAnimateDueBubble] = useState(false);

  useEffect(() => {
    if (notifications) setPendingWaterOrdersCount(notifications.length);
  }, [notifications]);

  useEffect(() => {
    if (user) {
      supabase.from('pos_retailer_settings')
        .select('water_delivery_enabled')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => { 
          if (data) setWaterDeliveryEnabled(data.water_delivery_enabled); 
        });
    }
  }, [user]);

  useEffect(() => {
    if (todaysSalesTotal !== prevSalesRef.current && !isLoadingSales) {
      setAnimateBubble(true);
      const timer = setTimeout(() => setAnimateBubble(false), 500); 
      prevSalesRef.current = todaysSalesTotal;
      return () => clearTimeout(timer);
    }
    prevSalesRef.current = todaysSalesTotal;
  }, [todaysSalesTotal, isLoadingSales]);

  useEffect(() => {
    if (totalCredit !== prevCreditRef.current && !isCreditLoading) {
      setAnimateCreditBubble(true);
      const timer = setTimeout(() => setAnimateCreditBubble(false), 500);
      prevCreditRef.current = totalCredit;
      return () => clearTimeout(timer);
    }
    prevCreditRef.current = totalCredit;
  }, [totalCredit, isCreditLoading]);

  useEffect(() => {
    if (currentMonthSales !== prevMonthSalesRef.current && !isMonthSalesLoading) {
      setAnimateMonthBubble(true);
      const timer = setTimeout(() => setAnimateMonthBubble(false), 500);
      prevMonthSalesRef.current = currentMonthSales;
      return () => clearTimeout(timer);
    }
    prevMonthSalesRef.current = currentMonthSales;
  }, [currentMonthSales, isMonthSalesLoading]);

  useEffect(() => {
    if (totalDue !== prevDueRef.current && !isDueLoading) {
      setAnimateDueBubble(true);
      const timer = setTimeout(() => setAnimateDueBubble(false), 500);
      prevDueRef.current = totalDue;
      return () => clearTimeout(timer);
    }
    prevDueRef.current = totalDue;
  }, [totalDue, isDueLoading]);

  useEffect(() => {
    if (location.pathname.startsWith('/pos/employees') || location.pathname.startsWith('/pos/attendance')) {
      setEmployeeMenuOpen(true);
    }
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  
  const navItemClass = (path, hasBadge = false) => cn(
    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group mb-1 relative border-l-4",
    hasBadge && "pr-14", // Ensure badge doesn't overlap text
    isActive(path)
      ? "bg-sidebar-active-bg text-heading shadow-md border-primary"
      : "border-transparent text-secondary-text hover:bg-dropdown-hover-bg hover:text-heading"
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const formatSalesAmount = (amount) => {
    const num = Number(amount) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    return Math.round(num).toString();
  };

  const formatCreditAmount = (amount) => {
    const num = Number(amount) || 0;
    if (num >= 1000000) return `${symbol}${(num / 1000000).toFixed(1)}M`;
    if (num >= 10000) return `${symbol}${(num / 1000).toFixed(1)}K`; 
    return formatCurrency(num);
  };

  const formatDueAmount = (amount) => {
    const num = Number(amount) || 0;
    if (num >= 1000000) return `${symbol}${(num / 1000000).toFixed(1)}M`;
    if (num >= 10000) return `${symbol}${(num / 1000).toFixed(1)}K`;
    return formatCurrency(num);
  };

  return (
    <div className={cn("flex flex-col h-full min-h-0 overflow-hidden bg-sidebar border-r border-border", className)}>
       <BusinessInfoHeader />

       <nav className="px-3 py-4 space-y-1 min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
          <NavLink to="/" className={navItemClass('/')} data-tour="home">
             <Home className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Home</span>
          </NavLink>

          <NavLink to="/pos/dashboard" className={navItemClass('/pos/dashboard')} data-tour="dashboard">
             <LayoutDashboard className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Dashboard</span>
          </NavLink>

          <NavLink to="/pos/point-of-sale" className={navItemClass('/pos/point-of-sale', true)} data-tour="pos">
             <ShoppingBag className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">POS</span>
             {!salesError && (
               <div className={cn(
                 "badge-bubble badge-success",
                 todaysSalesTotal > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
                 animateBubble ? "animate-bubble-update scale-110" : ""
               )}>
                 {isLoadingSales ? (
                   <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                 ) : todaysSalesTotal > 0 ? (
                   <span className="text-xs font-bold text-white tracking-wide">
                     {symbol}{formatSalesAmount(todaysSalesTotal)}
                   </span>
                 ) : null}
               </div>
             )}
          </NavLink>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("mb-1", !hasMembership && "cursor-not-allowed opacity-50")}>
                  <NavLink 
                    to={hasMembership ? "/pos/products" : "#"}
                    onClick={(e) => { if (!hasMembership) e.preventDefault(); }}
                    className={cn(navItemClass('/pos/products'), !hasMembership && "pointer-events-none mb-0")} 
                    data-tour="products"
                  >
                    <Package className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Products</span>
                    {!hasMembership && <Lock className="h-4 w-4 ml-auto text-disabled-text shrink-0" />}
                  </NavLink>
                </div>
              </TooltipTrigger>
              {!hasMembership && (
                <TooltipContent side="right" className="bg-popover border-border text-text">
                  <p>Activate a Membership plan to access Products</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <NavLink to="/pos/purchase-bill-entry" className={navItemClass('/pos/purchase-bill-entry', true)} data-tour="purchase-bill-entry">
             <FileText className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Purchase Bill Entry</span>
             {!dueError && (
               <div className={cn(
                 "badge-bubble badge-error",
                 totalDue > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
                 animateDueBubble ? "animate-due-update scale-110" : ""
               )}>
                 {isDueLoading ? (
                   <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                 ) : totalDue > 0 ? (
                   <span className="text-xs font-bold text-white tracking-wide">
                     {formatDueAmount(totalDue)}
                   </span>
                 ) : null}
               </div>
             )}
          </NavLink>
          
          <NavLink to="/pos/quotations" className={navItemClass('/pos/quotations')} data-tour="quotations">
             <FileText className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Quotations</span>
          </NavLink>

          <NavLink to="/pos/orders" className={navItemClass('/pos/orders')} data-tour="orders">
             <ListOrdered className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Orders</span>
          </NavLink>

          {waterDeliveryEnabled && (
            <NavLink to="/pos/water-orders" className={navItemClass('/pos/water-orders', pendingWaterOrdersCount > 0)} data-tour="water-orders">
              <Droplet className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Water Orders</span>
              {pendingWaterOrdersCount > 0 && (
                <Badge variant="destructive" className="absolute right-2 top-1/2 -translate-y-1/2 animate-pulse">{pendingWaterOrdersCount}</Badge>
              )}
            </NavLink>
          )}

          <NavLink to="/pos/settings" className={navItemClass('/pos/settings')} data-tour="settings">
             <Settings className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Settings</span>
          </NavLink>

          <div className="pt-4 mt-4 border-t border-border-secondary">
            <span className="px-4 text-xs text-secondary-text uppercase font-bold tracking-wider truncate">Management</span>
          </div>

          <NavLink to="/pos/customers" className={navItemClass('/pos/customers')} data-tour="customers">
             <Users className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Customers</span>
          </NavLink>

          <NavLink to="/pos/reports" className={navItemClass('/pos/reports', true)} data-tour="reports">
             <BarChart2 className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Reports</span>
             {!monthSalesError && (
               <div className={cn(
                 "badge-bubble badge-primary",
                 currentMonthSales > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
                 animateMonthBubble ? "animate-month-update scale-110" : ""
               )}>
                 {isMonthSalesLoading ? (
                   <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                 ) : currentMonthSales > 0 ? (
                   <span className="text-xs font-bold text-white tracking-wide">
                     {formattedMonthSales}
                   </span>
                 ) : null}
               </div>
             )}
          </NavLink>

          <NavLink to="/pos/credit" className={navItemClass('/pos/credit', true)} data-tour="credit">
             <DollarSign className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Credit</span>
             {!creditError && (
               <div className={cn(
                 "badge-bubble badge-warning",
                 totalCredit > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
                 animateCreditBubble ? "animate-credit-update scale-110" : ""
               )}>
                 {isCreditLoading ? (
                   <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                 ) : totalCredit > 0 ? (
                   <span className="text-xs font-bold text-white tracking-wide">
                     {formatCreditAmount(totalCredit)}
                   </span>
                 ) : null}
               </div>
             )}
          </NavLink>

          <div data-tour="employees">
            <button
              onClick={() => setEmployeeMenuOpen(!employeeMenuOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 border-l-4",
                (location.pathname.includes('/employees') || location.pathname.includes('/attendance'))
                  ? 'bg-sidebar-active-bg text-heading shadow-md border-primary'
                  : 'border-transparent text-secondary-text hover:bg-dropdown-hover-bg hover:text-heading'
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Users className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Employee Mgmt</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", employeeMenuOpen && 'rotate-180')} />
            </button>

            <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", employeeMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0')}>
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border-secondary pl-2">
                <NavLink to="/pos/employees" className={navItemClass('/pos/employees')}>
                  <Users className="h-4 w-4 shrink-0" /> <span className="truncate">All Employees</span>
                </NavLink>
                <NavLink to="/pos/attendance-tracker" className={navItemClass('/pos/attendance-tracker')}>
                  <Clock className="h-4 w-4 shrink-0" /> <span className="truncate">Attendance Tracker</span>
                </NavLink>
                <NavLink to="/pos/attendance-qr-scanner" className={navItemClass('/pos/attendance-qr-scanner')}>
                  <ScanBarcode className="h-4 w-4 shrink-0" /> <span className="truncate">Attendance QR</span>
                </NavLink>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border-secondary">
            <span className="px-4 text-xs text-secondary-text uppercase font-bold tracking-wider truncate">Marketing</span>
          </div>

          <NavLink to="/promotions" className={navItemClass('/promotions')} data-tour="promotions">
             <Megaphone className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Promotions</span>
          </NavLink>

          <div className="pt-4 mt-4 border-t border-border-secondary">
            <span className="px-4 text-xs text-secondary-text uppercase font-bold tracking-wider truncate">Tools</span>
          </div>

          <NavLink to="/pos/smart-reorder" className={navItemClass('/pos/smart-reorder')} data-tour="smart-reorder">
             <Briefcase className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Smart Reorder</span>
          </NavLink>

          <NavLink to="/pos/refunds" className={navItemClass('/pos/refunds')} data-tour="refunds">
             <ArrowRightLeft className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">Refunds</span>
          </NavLink>

          <NavLink to="/pos/gst-toolkit" className={navItemClass('/pos/gst-toolkit')} data-tour="gst-toolkit">
             <Calculator className="h-5 w-5 text-highlight group-hover:text-primary shrink-0" /> <span className="font-medium truncate">TAX Tools</span>
          </NavLink>

          <div className="pt-6 px-3 mt-auto space-y-2 pb-6">
             <Button
                variant="ghost"
                onClick={onHelpClick}
                className="w-full justify-start text-highlight hover:text-primary hover:bg-dropdown-hover-bg"
             >
                <HelpCircle className="h-5 w-5 mr-2 shrink-0" />
                <span className="truncate">Help Guide</span>
             </Button>

             <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-error hover:text-error/80 hover:bg-dropdown-hover-bg"
             >
                <LogOut className="h-5 w-5 mr-2 shrink-0" />
                <span className="truncate">Sign Out</span>
             </Button>
          </div>
       </nav>
    </div>
  );
};

export default Sidebar;