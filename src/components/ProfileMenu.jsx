import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, User as UserIcon, ShoppingBag, LogOut, Crown, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { normalizeProfileRole } from '@/lib/profileRoles';
import { useLanguage } from '@/contexts/LanguageContext';

const ProfileMenu = ({ user, membership, onSignOut, isSigningOut, profileError, retryProfileFetch }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const getDashboardLink = () => {
    if (!user?.profile?.role) return '/login';
    switch (normalizeProfileRole(user.profile.role)) {
      case 'admin': return '/admin';
      case 'seller': return '/pos/point-of-sale';
      case 'rider': return '/rider/dashboard';
      case 'salesman': return '/sales';
      case 'customer': return '/customer/dashboard';
      default: return '/profile';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("rounded-full h-9 w-9 bg-slate-100 dark:bg-slate-800 shrink-0", profileError && "border-2 border-red-500")}>
          {user?.profile?.avatar_url && !profileError ? (
             <img src={user.profile.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
          ) : (
             <UserIcon className={cn("h-5 w-5", profileError && "text-red-500")} />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      {/* Dark Navy / Slate Background matching reference design */}
      <DropdownMenuContent align="end" className="w-72 bg-[#0F172A] border-[#1E293B] text-slate-100 p-2 rounded-xl shadow-2xl">
        <DropdownMenuLabel className="font-normal px-2 pt-3 pb-2">
          <div className="flex flex-col space-y-1">
            <p className="text-[17px] font-semibold leading-none text-white tracking-tight">90 Layers</p>
            <p className="text-[13px] leading-none text-slate-400">ninetylayers@gmail.com</p>
          </div>
        </DropdownMenuLabel>
        
        {profileError && (
            <div className="px-2 py-2 mb-1 bg-red-900/30 text-red-400 text-xs rounded-lg border border-red-900/50 flex flex-col gap-2">
                <span>Failed to sync account data.</span>
                <Button size="sm" variant="outline" onClick={retryProfileFetch} className="h-7 border-red-800/50 hover:bg-red-900/50 text-red-400 bg-transparent">
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry Connection
                </Button>
            </div>
        )}

        <div className="px-2 py-2 mb-1">
          {/* Amber / Gold Accent Badge */}
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-3 flex flex-col">
            <div className="flex items-center gap-2 text-[#F59E0B] mb-1">
              <Crown className="h-[18px] w-[18px] fill-current" />
              <span className="font-semibold text-sm tracking-wide">Business Pro</span>
            </div>
            <p className="text-[11px] text-[#F59E0B]/70 ml-[26px]">Valid until: Lifetime</p>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-[#1E293B] my-1 mx-2" />

        <div className="p-1 space-y-0.5">
          <DropdownMenuItem 
            onClick={() => navigate(getDashboardLink())} 
            disabled={!!profileError || isSigningOut} 
            className="px-3 py-2.5 rounded-lg focus:bg-[#1E293B] focus:text-white cursor-pointer transition-colors"
          >
            <LayoutDashboard className="mr-3 h-[18px] w-[18px] text-slate-400" />
            <span className="font-medium text-[14px]">Dashboard</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => navigate('/profile')} 
            disabled={!!profileError || isSigningOut} 
            className="px-3 py-2.5 rounded-lg focus:bg-[#1E293B] focus:text-white cursor-pointer transition-colors"
          >
            <UserIcon className="mr-3 h-[18px] w-[18px] text-slate-400" />
            <span className="font-medium text-[14px]">Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => navigate('/orders')} 
            disabled={!!profileError || isSigningOut} 
            className="px-3 py-2.5 rounded-lg focus:bg-[#1E293B] focus:text-white cursor-pointer transition-colors"
          >
            <ShoppingBag className="mr-3 h-[18px] w-[18px] text-slate-400" />
            <span className="font-medium text-[14px]">My Orders</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-[#1E293B] my-1 mx-2" />
        
        <div className="p-1 pb-2">
          {/* Red text for log out with distinct hover */}
          <DropdownMenuItem 
            className="px-3 py-2.5 rounded-lg focus:bg-red-500/10 text-[#EF4444] focus:text-[#F87171] cursor-pointer transition-colors"
            onClick={(e) => {
              e.preventDefault();
              if (onSignOut) onSignOut();
            }}
            disabled={isSigningOut}
          >
            <LogOut className="mr-3 h-[18px] w-[18px]" />
            <span className="font-medium text-[14px]">{isSigningOut ? 'Signing out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
