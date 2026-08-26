import React, { useState, useCallback, memo } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Bike, Crown, History, AlertCircle, RefreshCw, Lightbulb, BookOpen, Users } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import ProfileMenu from '@/components/ProfileMenu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const Header = () => {
  const { user, signOut, loading, profileError, retryProfileFetch } = useAuth();
  const { membership } = useActiveMembership();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [logoError, setLogoError] = useState(false); 
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { t } = useLanguage();

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Sign out issue",
        description: "Encountered an error while signing out, but local data was cleared.",
      });
      navigate('/login');
    } finally {
      setIsSigningOut(false);
      setIsSheetOpen(false);
    }
  }, [signOut, navigate, isSigningOut, toast]);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const isRider = user?.profile?.role === 'rider';

  const hasWholesalerAccess = user?.profile?.role === 'seller' && membership?.plan && (
    membership.plan.allowed_business_category?.toLowerCase().includes('wholesale') ||
    membership.plan.name?.toLowerCase().includes('wholesale') ||
    (Array.isArray(membership.plan.features) && membership.plan.features.some(f => f.toLowerCase().includes('wholesale')))
  );

  const NavItem = ({ to, children, className }) => {
    const path = to.split('#')[0];
    const hash = to.split('#')[1];

    return (
      <NavLink 
        to={path} 
        onClick={(e) => {
          closeSheet();
          if (hash) {
            e.preventDefault();
            const scrollToHash = () => {
              const element = document.getElementById(hash);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            };

            if (window.location.pathname === path) {
              scrollToHash();
            } else {
              navigate(path);
              setTimeout(scrollToHash, 150);
            }
          }
        }}
        className={({ isActive }) => cn(
          "transition-colors hover:text-[#FF6B35] whitespace-nowrap",
          (isActive && !hash) || (window.location.pathname === path && hash) ? "text-[#FF6B35] font-semibold" : "text-slate-600 dark:text-slate-300",
          className
        )}
      >
        {children}
      </NavLink>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Logo and Desktop Nav */}
        <div className="flex items-center gap-4 lg:gap-8 overflow-hidden">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {logoError ? (
              <span className="text-xl font-bold block h-10 md:h-12 leading-none flex items-center text-primary">ShopoApp</span>
            ) : (
              <img 
                src="https://horizons-cdn.hostinger.com/3c38fd60-a24a-4d78-a3d8-58678655dafd/a7b90c40bcf1c912ebc37808895f8526.png"
                alt="ShopoApp Logo" 
                className="h-10 md:h-12 w-auto object-contain max-w-[130px] md:max-w-[160px]"
                onError={() => setLogoError(true)}
                loading="eager"
              />
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium overflow-x-auto custom-scrollbar pb-1">
            <NavItem to="/local-shops">Local Shop</NavItem>
            <NavItem to="/retailer-tools#features-section">Features</NavItem>
            <NavItem to="/shopo-connect" className="flex items-center gap-1">
              <Users className="w-4 h-4 text-purple-500" /> ShopoConnect
            </NavItem>
            {hasWholesalerAccess && (
              <NavItem to="/book-orders" className="flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-blue-500" /> Book Orders
              </NavItem>
            )}
            <NavItem to="/customer-purchase-history">Customer Portal</NavItem>
            <NavItem to="/growth-center" className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-yellow-500" /> Growth Center
            </NavItem>
            
            {isRider && (
               <Link to="/rider/dashboard" className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold transition-all hover:scale-105 whitespace-nowrap">
                 <Bike className="h-4 w-4" />
                 {t('common.dashboard')}
               </Link>
            )}
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <LanguageSelector />
          </div>
          
          {!loading && profileError && user && (
              <Button variant="ghost" size="sm" onClick={retryProfileFetch} className="text-red-600 hover:bg-red-50 hover:text-red-700 px-2 h-8 hidden sm:flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Profile Error - Retry</span>
              </Button>
          )}

          {!loading && user && !profileError && (
            <>
              {membership && (
                 <div className="hidden lg:flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 cursor-default" title="Active Membership">
                    <Crown className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                    <span className="font-bold">{membership.plan?.name || 'Pro Member'}</span>
                    {membership.membership_end_date && (
                      <span className="text-amber-600/70 border-l border-amber-200 dark:border-amber-800 pl-1.5 ml-0.5">
                        Exp: {format(new Date(membership.membership_end_date), 'MMM d')}
                      </span>
                    )}
                 </div>
              )}
            </>
          )}

          {/* Auth Menu - Redesigned ProfileMenu Dropdown */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ) : user ? (
            <ProfileMenu 
              user={user} 
              membership={membership} 
              onSignOut={handleSignOut} 
              isSigningOut={isSigningOut} 
              profileError={profileError} 
              retryProfileFetch={retryProfileFetch} 
            />
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" className="h-8 px-3 text-xs md:text-sm md:h-9 md:px-5 border-primary text-primary hover:bg-primary/5 font-semibold">
                  {t('common.login')}
                </Button>
              </Link>
              <Link to="/signup" className="hidden md:block">
                <Button variant="default" className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm">
                  {t('common.signup')}
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="flex md:hidden h-8 w-8 sm:h-10 sm:w-10 shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-slate-200" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/" onClick={closeSheet} className="flex items-center gap-2 text-lg font-bold mb-4">
                  {logoError ? (
                     <span className="text-xl font-bold block h-10 w-auto leading-none flex items-center text-primary">ShopoApp</span>
                  ) : (
                    <img 
                      src="https://horizons-cdn.hostinger.com/3c38fd60-a24a-4d78-a3d8-58678655dafd/a7b90c40bcf1c912ebc37808895f8526.png" 
                      alt="ShopoApp Logo" 
                      className="h-10 w-auto object-contain max-w-[160px]" 
                      onError={() => setLogoError(true)} 
                    />
                  )}
                </Link>
                
                {profileError && user && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg shadow-sm mb-2">
                        <p className="text-sm font-semibold text-red-700 mb-2">Profile Connection Error</p>
                        <Button size="sm" onClick={retryProfileFetch} className="w-full bg-red-600 hover:bg-red-700 text-white">
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                        </Button>
                    </div>
                )}
                
                {!profileError && membership && (
                   <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg flex items-center gap-3 shadow-sm mb-2">
                      <div className="h-8 w-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm text-amber-500">
                         <Crown className="h-4 w-4 fill-current" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">Active Membership</p>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">{membership.plan?.name}</p>
                      </div>
                   </div>
                )}

                <div className="space-y-1">
                  <h4 className="font-medium text-sm text-slate-500 mb-2 px-2">Business Tools</h4>
                  <Link to="/local-shops" onClick={closeSheet} className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Local Shop</Link>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      closeSheet();
                      const scrollToFeatures = () => {
                        const element = document.getElementById('features-section');
                        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      };
                      if (window.location.pathname === '/retailer-tools') {
                        scrollToFeatures();
                      } else {
                        navigate('/retailer-tools');
                        setTimeout(scrollToFeatures, 150);
                      }
                    }} 
                    className={cn(
                      "block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-left w-full transition-colors hover:text-[#FF6B35]",
                      window.location.pathname === '/retailer-tools' ? "text-[#FF6B35] font-semibold" : "text-slate-600 dark:text-slate-300"
                    )}
                  >
                    Features
                  </button>
                  <Link to="/shopo-connect" onClick={closeSheet} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-purple-600 dark:text-purple-400">
                    <Users className="h-4 w-4" /> ShopoConnect
                  </Link>
                  {hasWholesalerAccess && (
                    <Link to="/book-orders" onClick={closeSheet} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-blue-600">
                      <BookOpen className="h-4 w-4" /> Book Orders
                    </Link>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-medium text-sm text-slate-500 mb-2 px-2">Platform</h4>
                  <Link to="/customer-purchase-history" onClick={closeSheet} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-[#003D82] dark:text-blue-400">
                    <History className="h-4 w-4" /> Customer Portal
                  </Link>
                  <Link to="/growth-center" onClick={closeSheet} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-emerald-600 dark:text-emerald-400">
                    <Lightbulb className="h-4 w-4" /> Growth Center
                  </Link>
                </div>

                <div className="space-y-1">
                  <h4 className="font-medium text-sm text-slate-500 mb-2 px-2">Services</h4>
                  <Link to="/water-order" onClick={closeSheet} className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Water Order</Link>
                  {isRider && (
                    <Link to="/rider/dashboard" onClick={closeSheet} className="block px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md font-medium">Rider Dashboard</Link>
                  )}
                </div>
                
                <div className="mt-2 pt-4 border-t border-slate-200 dark:border-slate-800 px-2 flex gap-2">
                  <LanguageSelector />
                </div>

                {!user && (
                   <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <Link to="/login" onClick={closeSheet}>
                        <Button variant="outline" className="w-full h-11 border-primary text-primary hover:bg-primary/5 font-bold">
                          {t('common.login')}
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={closeSheet}>
                        <Button variant="default" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md">
                          {t('common.signup')}
                        </Button>
                      </Link>
                   </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default memo(Header);
