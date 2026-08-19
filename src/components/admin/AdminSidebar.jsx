import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  Globe, 
  Truck, 
  Calendar, 
  CreditCard, 
  FileText, 
  Map, 
  DollarSign, 
  Ticket, 
  Crown, 
  Coins, 
  Briefcase, 
  FileOutput as FileUser, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  ChevronRight, 
  Menu, 
  Droplet, 
  MapPin, 
  FileEdit, 
  Trophy, 
  Wrench, 
  Gift,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const AdminSidebar = ({ className }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({
    userManagement: true,
    ecommerce: true,
    delivery: true,
    marketing: true,
    contributions: true,
    growthCenter: true
  });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const MenuItem = ({ to, icon: Icon, label, onClick }) => (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
        isActive 
          ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
      {location.pathname === to && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full" />
      )}
    </NavLink>
  );

  const GroupHeader = ({ label, groupKey }) => (
    <button
      onClick={() => toggleGroup(groupKey)}
      className="flex items-center justify-between w-full px-3 py-2 mt-4 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
    >
      {label}
      {openGroups[groupKey] ? (
        <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
    </button>
  );

  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">ShopoApp Admin</h1>
            <p className="text-xs text-slate-500 mt-1">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {/* Main Sections */}
          <div className="mb-6 space-y-1">
            <MenuItem to="/admin" icon={LayoutDashboard} label="Overview" onClick={onLinkClick} />
            <MenuItem to="/pos" icon={Store} label="Point of Sale" onClick={onLinkClick} />
          </div>

          {/* User Management */}
          <div>
            <GroupHeader label="User Management" groupKey="userManagement" />
            {openGroups.userManagement && (
              <div className="space-y-1">
                <MenuItem to="/admin/customer-portal-access" icon={Globe} label="Customer Portal Access" onClick={onLinkClick} />
                <MenuItem to="/admin/sellers" icon={Store} label="Sellers" onClick={onLinkClick} />
                <MenuItem to="/admin/shop-owners" icon={Store} label="Shop Owners" onClick={onLinkClick} />
              </div>
            )}
          </div>

          {/* Ecommerce */}
          <div>
            <GroupHeader label="Ecommerce" groupKey="ecommerce" />
            {openGroups.ecommerce && (
              <div className="space-y-1">
                <MenuItem to="/admin/water-products" icon={Droplet} label="Water Products" onClick={onLinkClick} />
              </div>
            )}
          </div>

          {/* Growth Center (Blog) */}
          <div>
            <GroupHeader label="Growth Center" groupKey="growthCenter" />
            {openGroups.growthCenter && (
              <div className="space-y-1">
                <MenuItem to="/admin/growth-center/posts" icon={Lightbulb} label="Manage Posts" onClick={onLinkClick} />
                <MenuItem to="/admin/growth-center/categories" icon={FileText} label="Categories" onClick={onLinkClick} />
              </div>
            )}
          </div>

          {/* Community Contributions */}
          <div>
            <GroupHeader label="Contributions" groupKey="contributions" />
            {openGroups.contributions && (
              <div className="space-y-1">
                <MenuItem to="/admin/product-contributions" icon={FileEdit} label="Product Contributions" onClick={onLinkClick} />
                <MenuItem to="/admin/reward-periods" icon={Trophy} label="Rewards & Leaderboard" onClick={onLinkClick} />
              </div>
            )}
          </div>

          {/* Delivery System */}
          <div>
            <GroupHeader label="Delivery System" groupKey="delivery" />
            {openGroups.delivery && (
              <div className="space-y-1">
                <MenuItem to="/admin/delivery" icon={Truck} label="Delivery Dashboard" onClick={onLinkClick} />
                <MenuItem to="/admin/riders" icon={Users} label="Riders" onClick={onLinkClick} />
                <MenuItem to="/admin/bookings" icon={Calendar} label="Bookings" onClick={onLinkClick} />
                <MenuItem to="/admin/payments" icon={CreditCard} label="Payments" onClick={onLinkClick} />
                <MenuItem to="/admin/rider-settlements" icon={FileText} label="Rider Settlements" onClick={onLinkClick} />
                <MenuItem to="/admin/service-areas" icon={Map} label="Service Areas" onClick={onLinkClick} />
                <MenuItem to="/admin/water-delivery-areas" icon={MapPin} label="Water Delivery Areas" onClick={onLinkClick} />
                <MenuItem to="/admin/pricing" icon={DollarSign} label="Pricing Config" onClick={onLinkClick} />
                <MenuItem to="/admin/delivery-shops" icon={Store} label="Delivery Shops" onClick={onLinkClick} />
              </div>
            )}
          </div>

          {/* Marketing & Config */}
          <div>
            <GroupHeader label="Marketing & Config" groupKey="marketing" />
            {openGroups.marketing && (
              <div className="space-y-1">
                <MenuItem to="/admin/coupons" icon={Ticket} label="Coupons" onClick={onLinkClick} />
                <MenuItem to="/admin/memberships" icon={Crown} label="Memberships" onClick={onLinkClick} />
                <MenuItem to="/admin/referrals" icon={Gift} label="Referral Management" onClick={onLinkClick} />
                <MenuItem to="/admin/manual-plan-activation" icon={Wrench} label="Manual Plan Activation" onClick={onLinkClick} />
                <MenuItem to="/admin/reward-coins" icon={Coins} label="Reward Coins" onClick={onLinkClick} />
                <MenuItem to="/admin/vacancies" icon={Briefcase} label="Vacancies" onClick={onLinkClick} />
                <MenuItem to="/admin/job-applications" icon={FileUser} label="Job Applications" onClick={onLinkClick} />
                <MenuItem to="/admin/payment-settings" icon={CreditCard} label="Payment Settings" onClick={onLinkClick} />
                <MenuItem to="/admin/oauth-diagnostics" icon={ShieldCheck} label="OAuth Diagnostics" onClick={onLinkClick} />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full flex items-center justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <aside className={cn("w-64 fixed inset-y-0 left-0 z-50 hidden md:block border-r border-slate-800 bg-[#0f172a]", className)}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 text-white bg-slate-900/90 shadow-md backdrop-blur-sm border border-slate-700">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r border-slate-800 bg-[#0f172a]">
            <SidebarContent onLinkClick={() => document.body.click()} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default AdminSidebar;