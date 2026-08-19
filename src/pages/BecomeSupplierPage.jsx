import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Truck, CheckCircle, TrendingUp, Users, 
  CreditCard, Package, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const BecomeSupplierPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Expand your reach and sell directly to local retailers. Join ShopoApp as a verified wholesaler and grow your B2B distribution network." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1692914274321-d8d1b0c01d97?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="Logistics Warehouse" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            Sell Smarter, Reach Further
          </motion.h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            Wholesalers list products on ShopoApp. Retailers place COD orders. You handle delivery & payment collection.
          </p>
          <Link to="/seller-signup">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 text-lg font-semibold">
              Start Selling as Wholesaler
            </Button>
          </Link>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">How it Works for Wholesalers</h2>
          <p className="text-slate-600">A simple, transparent process designed for your growth.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { title: "1. Sign Up", desc: "Register as a verified wholesaler on our platform." },
            { title: "2. List Products", desc: "Upload your inventory with bulk tools." },
            { title: "3. Receive Orders", desc: "Get COD order requests directly from retailers." },
            { title: "4. Deliver & Collect", desc: "Fulfill orders and collect payment on delivery." }
          ].map((step, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-slate-300 group-hover:scale-110 transition-transform">
                {idx + 1}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">{step.title}</h3>
              <p className="text-slate-600 relative z-10">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Partner with ShopoApp?</h2>
              <div className="space-y-6">
                {[
                  { icon: Users, text: "Direct access to thousands of verified retailers" },
                  { icon: TrendingUp, text: "Data-driven insights to optimize your inventory" },
                  { icon: Package, text: "Advanced order management dashboard" },
                  { icon: CreditCard, text: "Zero commission on product sales - just a membership fee" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-lg text-slate-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-100 rounded-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Membership Model</h3>
              <p className="text-slate-600 mb-6">
                Unlike other platforms that take a cut of every sale, ShopoApp operates on a transparent membership model.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle className="w-4 h-4 text-green-500" /> Fixed monthly/yearly fee</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle className="w-4 h-4 text-green-500" /> Keep 100% of your sales revenue</li>
                <li className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle className="w-4 h-4 text-green-500" /> Access to premium analytics tools</li>
              </ul>
              <Link to="/seller-signup">
                <Button className="w-full">View Plans & Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Message */}
      <section className="py-16 bg-slate-900 text-center text-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <Truck className="w-12 h-12 mx-auto mb-6 text-blue-400" />
          <h2 className="text-2xl font-bold mb-4">You Control Fulfillment</h2>
          <p className="text-slate-400 text-lg">
            ShopoApp facilitates the connection and order placement. As a wholesaler, you maintain full control over your logistics, delivery schedules, and payment collection (COD).
          </p>
        </div>
      </section>
    </div>
  );
};

export default BecomeSupplierPage;