import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MonitorSmartphone, ShoppingCart, Store, Users, CheckCircle, ArrowRight, Wallet, FileText, UserCheck, TrendingUp, BarChart3, Zap, Globe, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ImageWithFallback from '@/components/ImageWithFallback';
import { supabase } from '@/lib/supabaseClient';
import FeatureCard from '@/components/FeatureCard';

const RetailerToolsPage = () => {
  const [sellerCount, setSellerCount] = useState(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [countError, setCountError] = useState(null);

  const formatCount = num => {
    if (num === null || num === undefined) return 'N/A';
    if (num < 1000) {
      return num.toString();
    } else if (num < 1000000) {
      const formatted = (num / 1000).toFixed(1);
      return `${formatted}K+`;
    } else {
      const formatted = (num / 1000000).toFixed(1);
      return `${formatted}M+`;
    }
  };

  useEffect(() => {
    const fetchSellerCount = async () => {
      try {
        setIsLoadingCount(true);
        setCountError(null);
        const {
          count,
          error
        } = await supabase.from('public_shop_profiles').select('id', {
          count: 'exact',
          head: true
        }).eq('role', 'seller');
        if (error) {
          throw error;
        }
        setSellerCount(count);
      } catch (err) {
        console.error('Error fetching seller count:', err);
        setCountError(err.message);
        setSellerCount(null);
      } finally {
        setIsLoadingCount(false);
      }
    };
    fetchSellerCount();

    const subscription = supabase.channel('seller-registrations').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'profiles',
      filter: 'role=eq.seller'
    }, () => {
      setSellerCount(prevCount => prevCount !== null ? prevCount + 1 : null);
    }).subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };
  
  const heroTextVariants = {
    hidden: {
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };
  
  const keyPointsVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        type: "spring"
      }
    }
  };

  const tools = [{
    icon: MonitorSmartphone,
    title: "Advanced POS Billing",
    desc: "Process sales quickly with our cloud-based Point of Sale system. Works on mobile, tablet, and desktop. Print invoices or send digital receipts instantly.",
    gradient: "from-blue-600 to-indigo-600",
    shadow: "shadow-blue-500/20",
    path: "/features/pos-billing"
  }, {
    icon: Store,
    title: "Inventory Management",
    desc: "Track stock levels in real-time. Automatically update inventory when you receive wholesale orders from B2B Nexus suppliers.",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/20",
    path: "/features/inventory-management"
  }, {
    icon: ShoppingCart,
    title: "Your Own Online Shop",
    desc: "Launch a digital storefront for your local customers in seconds. Share your shop link on WhatsApp and accept online orders seamlessly.",
    gradient: "from-violet-600 to-purple-600",
    shadow: "shadow-purple-500/20",
    path: "/features/online-shop"
  }, {
    icon: Users,
    title: "Customer Management",
    desc: "Maintain a digital Khata (ledger) for your customers. Track credit, send payment reminders, and build long-term loyalty.",
    gradient: "from-orange-500 to-red-500",
    shadow: "shadow-orange-500/20",
    path: "/features/customer-management"
  }, {
    icon: Wallet,
    title: "Credit Management",
    desc: "Manage customer credits with complete transparency. Access detailed bills & credit records to keep your finances in check.",
    gradient: "from-pink-500 to-rose-600",
    shadow: "shadow-pink-500/20",
    path: "/features/credit-management"
  }, {
    icon: FileText,
    title: "GST Register",
    desc: "Simplify compliance with easy GST return filling. Maintain Purchase Invoice records and track daily In-Out register effortlessly.",
    gradient: "from-cyan-500 to-blue-500",
    shadow: "shadow-cyan-500/20",
    path: "/features/gst-register"
  }, {
    icon: UserCheck,
    title: "Employee Management",
    desc: "Advanced staff tracking with role-wise access control. Manage attendance, performance, and payouts all in one place.",
    gradient: "from-amber-500 to-yellow-600",
    shadow: "shadow-amber-500/20",
    path: "/features/employee-management"
  }, {
    icon: TrendingUp,
    title: "Smart Re-ordering",
    desc: "AI-powered suggestions help you refill inventories in appropriate quantities before you run out, optimizing your capital.",
    gradient: "from-lime-500 to-green-600",
    shadow: "shadow-lime-500/20",
    path: "/features/smart-reordering"
  }];
  
  const keyPoints = [{
    label: "Instant Setup",
    icon: Zap,
    gradient: "from-blue-600 to-purple-600",
    shadow: "shadow-purple-500/30"
  }, {
    label: "30-Day Free Trial",
    icon: Calendar,
    gradient: "from-green-500 to-emerald-600",
    shadow: "shadow-emerald-500/30"
  }, {
    label: "No Credit Card Required",
    icon: CreditCard,
    gradient: "from-orange-500 to-amber-600",
    shadow: "shadow-orange-500/30"
  }];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">
      <Helmet>
        <title>Retailer Tools - B2B Nexus</title>
        <meta name="description" content="Premium POS and business management suite for modern retailers. Billing, Inventory, CRM, and E-commerce in one powerful platform." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-900 text-white">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
           <motion.div initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 10, ease: "linear" }} className="w-full h-full">
             <ImageWithFallback src="https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" alt="Modern Retail Store" className="w-full h-full object-cover opacity-40" fallbackGradient="from-slate-900 to-blue-950" />
           </motion.div>
           <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/95 to-blue-950/80 backdrop-blur-[2px]"></div>
           
           {/* Abstract Shapes */}
           <div className="absolute top-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
           <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10 pt-24 pb-12 md:pt-32 md:pb-20">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={heroTextVariants}>
              <Badge className="bg-white/10 text-blue-200 border-blue-400/30 backdrop-blur-md mb-8 px-6 py-2 text-sm uppercase tracking-widest font-semibold shadow-xl">
                The All-in-One Retail OS
              </Badge>
              
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold mb-8 leading-tight tracking-tight">
                Empower Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
                  Retail Business
                </span>
              </h1>
              
              <p className="text-lg md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto font-light leading-relaxed px-4">
                Transform your local shop into a digital powerhouse. Billing, inventory, online store, and customer loyalty — unified in one premium platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-full px-4">
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-14 md:h-16 px-10 text-lg rounded-full shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-1">
                    Start Your Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              {/* Key Points Section */}
              <motion.div className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full" variants={containerVariants}>
                {keyPoints.map((point, index) => (
                  <motion.div 
                    key={index} 
                    variants={keyPointsVariants} 
                    whileHover={{ scale: 1.05, y: -5 }} 
                    className={`
                      relative overflow-hidden rounded-2xl p-6 md:p-8
                      bg-gradient-to-br ${point.gradient}
                      shadow-xl ${point.shadow} hover:shadow-2xl
                      backdrop-blur-md border border-white/10
                      flex flex-col items-center justify-center text-center
                      group cursor-default
                    `}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:bg-white/20 transition-all duration-500"></div>
                    
                    <div className="mb-4 p-4 rounded-full bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <point.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                      {point.label}
                    </h3>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 relative z-20 -mt-8 mx-4 md:mx-auto max-w-6xl rounded-2xl shadow-xl p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
         {[
           { label: "Sellers Registered", value: isLoadingCount ? null : formatCount(sellerCount), icon: Users, isLoading: isLoadingCount, hasError: countError !== null }, 
           { label: "Transactions Processed", value: "250k+", icon: BarChart3, isLoading: false, hasError: false }, 
           { label: "Cities Covered", value: "50+", icon: Globe, isLoading: false, hasError: false }, 
           { label: "Uptime Guarantee", value: "99.9%", icon: Zap, isLoading: false, hasError: false }
         ].map((stat, i) => (
           <div key={i} className="text-center">
             <div className="flex justify-center mb-2 md:mb-3">
               <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
             </div>
             
             {stat.isLoading ? (
               <Skeleton className="h-8 md:h-10 w-20 mx-auto mb-1" />
             ) : (
               <div className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1">
                 {stat.hasError ? <span className="text-slate-400 dark:text-slate-500" title="Unable to load count">N/A</span> : stat.value}
               </div>
             )}
             
             <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{stat.label}</div>
           </div>
         ))}
      </div>

      {/* Tools Grid */}
      <section id="features-section" className="py-20 md:py-32 bg-slate-50 dark:bg-slate-900 relative overflow-hidden scroll-mt-16">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 md:mb-20 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-4 py-1">Powerful Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Everything You Need to Scale</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Our comprehensive suite of tools is designed specifically for modern retailers, replacing fragmented systems with one cohesive platform.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto" 
            variants={containerVariants} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }}
          >
            {tools.map((tool, idx) => (
              <FeatureCard key={idx} {...tool} delay={idx * 0.1} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Highlight: COD Sales */}
      <section className="py-20 md:py-24 bg-white dark:bg-slate-900 relative">
        <div className="container mx-auto px-4">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-950"></div>
            
            <div className="grid lg:grid-cols-2 gap-12 relative z-10 items-center">
              <div className="p-8 md:p-16 lg:pr-0">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-6 backdrop-blur-sm">Local Commerce Optimized</Badge>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">Designed for the Way <br /> You Do Business</h2>
                <p className="text-slate-300 mb-8 text-lg leading-relaxed">
                  We understand the nuances of local retail. That's why our platform seamlessly integrates traditional workflows like Cash on Delivery and Udhaar (credit) with modern digital efficiency.
                </p>
                
                <ul className="space-y-5 mb-10">
                  {["Integrated Cash on Delivery (COD) workflows", "One-click WhatsApp receipts & invoices", "Offline-first mode for reliable performance", "Multi-language support for your entire staff"].map((item, i) => (
                    <motion.li 
                      key={i} 
                      className="flex items-center gap-4 text-slate-200" 
                      initial={{ opacity: 0, x: -20 }} 
                      whileInView={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.1 }} 
                      viewport={{ once: true }}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-lg">{item}</span>
                    </motion.li>
                  ))}
                </ul>

                <Link to="/signup" className="block w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 border-none h-14 px-8 text-lg font-semibold rounded-xl">
                    Experience the Difference
                  </Button>
                </Link>
              </div>
              
              <div className="relative h-full min-h-[400px] lg:min-h-[600px] bg-slate-800/50 hidden md:block">
                 <div className="absolute inset-0">
                   <ImageWithFallback src="https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="POS Machine Interface" className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" fallbackGradient="from-slate-700 to-slate-800" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                   <div className="absolute inset-0 bg-gradient-to-l from-slate-900/50 via-transparent to-transparent"></div>
                 </div>
                 
                 {/* Floating UI Elements Mockup */}
                 <motion.div 
                   className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-2xl max-w-xs" 
                   initial={{ y: 50, opacity: 0 }} 
                   whileInView={{ y: 0, opacity: 1 }} 
                   transition={{ delay: 0.5, duration: 0.8 }}
                 >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm">Payment Received</div>
                            <div className="text-slate-300 text-xs">Just now via UPI</div>
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-white">₹1,250.00</div>
                 </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-24 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden text-center text-white">
        <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-50%] right-[-20%] w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }} 
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 md:mb-8">Ready to modernize your shop?</h2>
            <p className="text-lg md:text-xl text-blue-100 mb-8 md:mb-10 max-w-2xl mx-auto">
              Join thousands of successful retailers who have transformed their business with B2B Nexus. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 h-14 md:h-16 px-12 text-lg md:text-xl rounded-full shadow-2xl shadow-blue-900/20 font-bold transform hover:-translate-y-1 transition-all">
                  Get Started Now <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-blue-200 opacity-80">No credit card required • Cancel anytime • 24/7 Support</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default RetailerToolsPage;
