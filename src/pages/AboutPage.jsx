import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Building2, Target, Users, HeartHandshake as Handshake, Info, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AboutPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Discover the mission, values, and team behind ShopoApp. Learn why retailers and wholesalers choose ShopoApp as their digital transformation partner." />
      </Helmet>

      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">About ShopoApp</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Empowering businesses through digital connectivity and smart retail solutions.
          </p>
        </motion.div>

        {/* Business Model Disclaimer */}
        <div className="max-w-4xl mx-auto mb-16">
           <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 flex gap-4">
                 <Info className="w-8 h-8 text-blue-600 shrink-0" />
                 <div>
                    <h3 className="font-bold text-blue-900 text-lg mb-2">Our Business Model</h3>
                    <p className="text-blue-800 leading-relaxed">
                       <strong>ShopoApp is a B2B marketplace facilitator.</strong> We do not sell or own physical inventory. 
                       Our platform connects independent wholesalers with retailers. Product transactions are fulfilled directly 
                       by suppliers via Cash on Delivery (COD). We provide the digital infrastructure, POS software, and 
                       connection tools for which we charge membership subscriptions.
                    </p>
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <img
              className="rounded-lg shadow-xl w-full h-auto object-cover"
              alt="Modern office interior with team collaborating"
             src="https://images.unsplash.com/photo-1637622124152-33adfabcc923" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-slate-800">Who We Are</h2>
            <div className="prose prose-lg text-slate-600 leading-relaxed">
              <p className="mb-4">
                ShopoApp is a product of <span className="font-bold text-blue-600">Zyvora Technologies Pvt. Ltd.</span>, a registered technology company dedicated to modernizing the B2B supply chain in India. We recognized the fragmentation in the wholesale-retail market and built a platform to bridge this gap.
              </p>
              <p className="mb-4">
                Our platform serves two key roles:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                 <li><strong>For Retailers:</strong> We provide a comprehensive suite of tools (POS, Inventory, Online Store) to digitize their operations.</li>
                 <li><strong>For Wholesalers:</strong> We offer a digital marketplace to list products and reach a wider network of retail buyers.</li>
              </ul>
              <p className="mt-4">
                We believe in fair trade and transparency. By facilitating direct connections and enabling Cash on Delivery payments, we ensure trust remains at the center of every transaction.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-bold gradient-text mb-12">Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="glass-effect p-8 rounded-xl text-center"
            >
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Empowerment</h3>
              <p className="text-slate-600">Giving small businesses the tools typically reserved for large enterprises.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-effect p-8 rounded-xl text-center"
            >
              <ShieldCheck className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Integrity</h3>
              <p className="text-slate-600">Transparent business model. No hidden commissions on product sales.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="glass-effect p-8 rounded-xl text-center"
            >
              <Target className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Innovation</h3>
              <p className="text-slate-600">Constantly evolving our software to meet the changing needs of the market.</p>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;