import React, { memo, useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ShieldCheck, Store, CheckCircle, Database, Smartphone, CreditCard, Crown, Zap, AlertCircle, RefreshCw, Lock, Headphones as HeadphonesIcon, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/button-gradient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ImageWithFallback from '@/components/ImageWithFallback';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import RegionSelector from '@/components/RegionSelector';

const safeFormatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  } catch (e) {
    console.error('[HomePage] Date formatting error:', e);
    return '';
  }
};

const StepCard = memo(({ icon: Icon, title, desc, color, index }) => (
  <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 text-center group"
  >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
  </motion.div>
));
StepCard.displayName = 'StepCard';

const FeatureRow = memo(({ title, desc, icon: Icon }) => (
  <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="mt-1 p-2 bg-slate-800 rounded-lg h-fit">
          <Icon className="w-5 h-5 text-[#FF6B35]" />
      </div>
      <div>
          <h4 className="font-bold text-white text-lg">{title}</h4>
          <p className="text-slate-400 text-sm mt-1">{desc}</p>
      </div>
  </div>
));
FeatureRow.displayName = 'FeatureRow';

const MembershipBanner = memo(({ membership, formattedEndDate }) => {
  if (!membership) return null;
  
  return (
    <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 py-6">
        <div className="bg-[image:var(--gradient-primary)] rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="h-16 w-16 bg-white/20 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 border border-white/30">
              <Crown className="h-8 w-8 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold tracking-tight">Current Plan: {membership.plan?.name || 'Pro'}</h2>
                <Badge className="bg-green-500 text-white border-0">Active</Badge>
              </div>
              <p className="text-white/80 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-300" />
                {membership.plan?.max_pos_users || 1} POS Users • 
                {membership.plan?.max_products ? ` ${membership.plan.max_products} Products` : ' Unlimited Products'}
              </p>
              {formattedEndDate && (
                <p className="text-white/60 text-xs mt-1 font-medium">
                  Valid until: {formattedEndDate}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 relative z-10 w-full md:w-auto">
            <Link to="/pos/dashboard" className="flex-1 md:flex-none">
              <Button className="w-full bg-white text-[#003D82] hover:bg-slate-100 font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                Go to POS
              </Button>
            </Link>
            <Link to="/membership-plans" className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all backdrop-blur-sm">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});
MembershipBanner.displayName = 'MembershipBanner';

const HomePageContent = () => {
  const { membership, hasActiveMembership, isLoading, error: membershipError } = useActiveMembership();
  const { profileError, retryProfileFetch } = useAuth();
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    console.debug('[HomePage] Rendered. Membership state:', { hasActiveMembership, isLoading, isError: !!membershipError });
  }, [hasActiveMembership, isLoading, membershipError]);

  const formattedEndDate = useMemo(() => {
    try {
      if (!membership?.membership_end_date) return null;
      return safeFormatDate(membership.membership_end_date);
    } catch (err) {
      console.error('[HomePage] Error formatting membership end date:', err);
      return null;
    }
  }, [membership?.membership_end_date]);

  if (renderError) {
    throw renderError;
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 w-full font-sans">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="ShopoApp is an all-in-one POS billing, inventory management, GST billing, customer management and digital store platform for retailers and wholesalers." />
      </Helmet>
      
      <main className="w-full">
        {/* Region Selector Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 flex justify-end">
            <RegionSelector />
        </div>

        {profileError && (
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 py-4 px-4">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-sm">Account Sync Error</h3>
                            <p className="text-xs opacity-90">We had trouble loading your full profile. Some features might be limited.</p>
                        </div>
                    </div>
                    <Button onClick={retryProfileFetch} variant="outline" className="border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 whitespace-nowrap">
                        <RefreshCw className="w-4 h-4" /> Try Again
                    </Button>
                </div>
            </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 py-6 px-4">
             <div className="container mx-auto">
               <Skeleton className="w-full h-32 rounded-2xl" />
             </div>
          </div>
        ) : hasActiveMembership ? (
          <ErrorBoundary fallback={
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 text-center">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Could not load membership details.</p>
            </div>
          }>
            <MembershipBanner membership={membership} formattedEndDate={formattedEndDate} />
          </ErrorBoundary>
        ) : null}

        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 text-white pt-16">
           <div className="absolute inset-0 z-0">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1642132652866-6fa262d3161f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                alt="ShopoApp Warehouse and Logistics" 
                className="w-full h-full opacity-30 object-cover"
                fallbackGradient="from-slate-800 to-[#003D82]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-[#003D82]/40"></div>
           </div>

           <div className="container mx-auto px-4 relative z-10 text-center">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-5xl mx-auto"
              >
                 <Badge className="bg-[#003D82]/30 text-blue-200 border-[#FF6B35]/30 backdrop-blur-sm mb-6 px-4 py-1.5 text-sm uppercase tracking-wider">
                    Smart Business Software for Indian Retail
                 </Badge>
                 
                 <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
                    POS Billing, Inventory & <span className="gradient-text">Digital Shop</span>
                 </h1>
                 
                 <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto font-light">
                    Built for modern retailers and wholesalers with practical tools for billing, stock, customers, and online selling.
                 </p>
                 
                 <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
                    Run daily operations from one secure platform and give local customers a simple way to shop from your digital storefront.
                 </p>
                 
                 <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
                    <Link to="/signup">
                        <GradientButton size="lg" variant="primary" className="w-full sm:w-auto text-lg h-14">
                            Get Started
                        </GradientButton>
                    </Link>
                    <Link to="/retailer-tools">
                        <GradientButton size="lg" variant="secondary" className="w-full sm:w-auto text-lg h-14 bg-slate-900/50 backdrop-blur-md border-[#FF6B35]">
                            Explore Retailer Tools
                        </GradientButton>
                    </Link>
                 </div>

                 {/* Transparent Pricing Message */}
                 <div className="mt-4 mb-8">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      <span className="text-slate-500 dark:text-slate-600">Starting at</span>{' '}
                      <span className="text-slate-300 dark:text-slate-400 font-semibold">Flexible Rates</span>
                    </p>
                 </div>

                 <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-400" /> Enterprise Security</div>
                    <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#FF6B35]" /> Flexible Billing</div>
                    <div className="flex items-center gap-2"><HeadphonesIcon className="w-4 h-4 text-blue-400" /> 24/7 Support</div>
                    <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-green-400" /> Compliant & Secure</div>
                 </div>
              </motion.div>
           </div>
        </section>

        <section className="py-20 bg-white dark:bg-slate-900">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">How ShopoApp Works</h2>
                    <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">Practical tools that support everyday retail operations.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { 
                            icon: Database,
                            title: "1. Organize Your Inventory",
                            desc: "Maintain product and stock information for accurate day-to-day operations.",
                            color: "bg-blue-50 dark:bg-blue-900/20 text-[#003D82] dark:text-blue-300"
                        },
                        { 
                            icon: Smartphone,
                            title: "2. Bill Customers Efficiently",
                            desc: "Use ShopoApp POS tools to create sales and digital receipts.",
                            color: "bg-orange-50 dark:bg-orange-900/20 text-[#FF6B35] dark:text-orange-300"
                        },
                        { 
                            icon: Store,
                            title: "3. Share Your Digital Shop",
                            desc: "Let local customers browse your visible products and place Digital Shop orders.",
                            color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300"
                        }
                    ].map((step, idx) => (
                        <StepCard key={`step-${idx}`} {...step} index={idx} />
                    ))}
                </div>
            </div>
        </section>

        <section className="py-24 bg-slate-900 text-white overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <Badge className="bg-[#003D82]/30 text-blue-200 border-[#FF6B35]/30 mb-6">Platform Features</Badge>
                        <h2 className="text-4xl font-bold mb-6">Tools to Power Your Commerce</h2>
                        <p className="text-slate-400 mb-8 text-lg">
                            ShopoApp provides essential software infrastructure for modern retail businesses.
                        </p>
                        
                        <div className="space-y-6">
                            {[
                                { title: "POS Billing System", desc: "Manage in-store sales with our advanced Point of Sale software.", icon: Smartphone },
                                { title: "Inventory Management", desc: "Real-time stock tracking across multiple locations.", icon: Database },
                                { title: "Online Shop for Retailers", desc: "Get your own digital storefront to sell to local customers.", icon: Store },
                                { title: "Customer Management", desc: "Keep customer, credit, and transaction information organized.", icon: CreditCard }
                            ].map((feature, idx) => (
                                <FeatureRow key={`feature-${idx}`} {...feature} />
                            ))}
                        </div>
                        
                        <div className="mt-10">
                            <Link to="/retailer-tools">
                                <GradientButton variant="primary" size="lg">
                                    Explore POS Tools <ArrowRight className="ml-2 w-4 h-4" />
                                </GradientButton>
                            </Link>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35] to-[#003D82] rounded-2xl transform rotate-6 opacity-20 blur-2xl"></div>
                        <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            <ImageWithFallback 
                                src="https://images.unsplash.com/photo-1630514969818-94aefc42ec47?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                                alt="POS Interface and Analytics" 
                                className="w-full h-auto object-cover"
                                fallbackGradient="from-blue-900 to-[#003D82]"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="py-20 bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
            <div className="container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Trust & Transparency</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="border-none shadow-md bg-white dark:bg-slate-900 hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-6">
                                <ShieldCheck className="w-10 h-10 text-[#003D82] dark:text-blue-400 mx-auto mb-4" />
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Enterprise Security</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Bank-grade encryption and secure infrastructure to protect your business data.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-white dark:bg-slate-900 hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-6">
                                <HeadphonesIcon className="w-10 h-10 text-[#FF6B35] mx-auto mb-4" />
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2">24/7 Customer Support</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Dedicated support team available round clock to assist your business.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-white dark:bg-slate-900 hover:shadow-xl transition-shadow duration-300">
                            <CardContent className="p-6">
                                <Lock className="w-10 h-10 text-[#003D82] dark:text-blue-400 mx-auto mb-4" />
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Regulatory Compliance</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Fully compliant with local regulations and data protection standards.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                     <div className="relative order-2 lg:order-1">
                        <div className="absolute inset-0 bg-gradient-to-l from-[#FF6B35] to-[#003D82] rounded-2xl transform -rotate-3 opacity-15 blur-2xl"></div>
                        <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                            <ImageWithFallback 
                                src="https://images.unsplash.com/photo-1674027392842-29f8354e236c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                                alt="Local Shop Owner with Digital Tools" 
                                className="w-full h-auto object-cover"
                                fallbackGradient="from-slate-800 to-[#003D82]"
                                loading="lazy"
                            />
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <Badge className="bg-orange-50 dark:bg-orange-900/20 text-[#FF6B35] dark:text-orange-300 border-[#FF6B35]/30 mb-6">Empowering Local Business</Badge>
                        <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white">Modernize Your Retail Operations</h2>
                        <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
                            We bridge the gap between traditional retail and digital efficiency with real-time reporting, seamless payment integration, and easy-to-use tools.
                        </p>
                        
                        <ul className="space-y-4 mb-8">
                            {[
                                "Real-time inventory tracking and reporting",
                                "Track customer credit (Udhaar) digitally with reminders",
                                "Get insights on top-selling products and trends",
                                "Seamless payment integration for online and offline sales"
                            ].map((item, idx) => (
                                <li key={`list-${idx}`} className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-[#003D82] dark:text-blue-400 flex-shrink-0" />
                                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <Link to="/signup">
                            <GradientButton variant="primary" size="lg">
                                Start Your Digital Journey <ArrowRight className="ml-2 w-4 h-4" />
                            </GradientButton>
                        </Link>
                    </div>
                </div>
            </div>
        </section>

        <section className="py-24 bg-slate-50 dark:bg-slate-800 text-center border-t border-slate-200 dark:border-slate-700">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">Ready to Scale Your Business?</h2>
                <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
                    Join thousands of successful retailers powering their retail businesses with ShopoApp.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
                    <Link to="/signup">
                        <GradientButton size="lg" variant="primary" className="w-full sm:w-auto px-8 h-14">
                            Get Started
                        </GradientButton>
                    </Link>
                    <Link to="/signup">
                        <GradientButton size="lg" variant="secondary" className="w-full sm:w-auto px-8 h-14 bg-white dark:bg-slate-900">
                            Join as Retailer
                        </GradientButton>
                    </Link>
                </div>
                <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Real-time Analytics
                    </div>
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Secure & Compliant
                    </div>
                    <div className="flex items-center gap-2">
                        <HeadphonesIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        24/7 Support
                    </div>
                    <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Mobile-First Design
                    </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
};

const HomePage = () => (
  <ErrorBoundary>
    <HomePageContent />
  </ErrorBoundary>
);

export default HomePage;
