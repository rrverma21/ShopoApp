import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Scale, MessageCircle, Gavel, CheckCircle, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const DisputeResolutionPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>Dispute Resolution Policy - ShopoApp</title>
        <meta name="description" content="Process for resolving disputes between buyers, sellers, and the platform." />
      </Helmet>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Dispute Resolution Policy</h1>
          <p className="text-lg text-slate-600">
            We aim for seamless transactions, but we have a structured process to handle disagreements fairly and efficiently.
          </p>
        </motion.div>

        <div className="space-y-8 relative">
          {/* Vertical line for timeline effect on desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -z-10"></div>

          {/* Level 1 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 w-full text-center md:text-right">
              <h3 className="text-2xl font-bold text-blue-600 mb-2">Level 1: Initial Support</h3>
              <p className="text-slate-600">Raise a ticket via App or Email</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold z-10 shrink-0">1</div>
            <Card className="flex-1 w-full border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-blue-500 mt-1" />
                  <p className="text-slate-600 text-sm">
                    Contact our support team at <strong>support@shopoapp.com</strong> within 3 days of the issue. Most issues regarding delivery delays, minor defects, or payment status are resolved here within 24-48 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Level 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="flex-1 w-full text-center md:text-left">
              <h3 className="text-2xl font-bold text-indigo-600 mb-2">Level 2: Mediation</h3>
              <p className="text-slate-600">Management Review</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold z-10 shrink-0">2</div>
            <Card className="flex-1 w-full border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mt-1" />
                  <p className="text-slate-600 text-sm">
                    If Level 1 support cannot resolve the issue, it is escalated to a Disputes Manager. Both parties (Buyer and Seller) may be asked to provide evidence (photos, invoices, chat logs). A decision is typically made within 5-7 business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Level 3 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 w-full text-center md:text-right">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Level 3: Arbitration</h3>
              <p className="text-slate-600">Final Legal Resolution</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold z-10 shrink-0">3</div>
            <Card className="flex-1 w-full border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Gavel className="w-5 h-5 text-slate-700 mt-1" />
                  <p className="text-slate-600 text-sm">
                    For unresolved disputes involving significant value, arbitration may be initiated in accordance with the Arbitration and Conciliation Act, 1996. The jurisdiction for all legal proceedings is <strong>Mumbai, India</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" /> 
            Common Dispute Types
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Product Mismatch</h4>
              <p className="text-sm text-slate-500">Item delivered differs significantly from the description or image provided by the seller.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Non-Delivery</h4>
              <p className="text-sm text-slate-500">Order marked as delivered but not received by the customer.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Damaged Goods</h4>
              <p className="text-sm text-slate-500">Physical damage occurred during transit or before packaging.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Payment Issues</h4>
              <p className="text-sm text-slate-500">Double deduction or payment failure despite successful debit.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DisputeResolutionPage;