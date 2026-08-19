import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, RefreshCw, AlertTriangle, Phone, Droplet, Store, ArrowRight, XCircle, Building2, Truck, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RefundCancellationPolicy = () => {
  const sections = [
    {
      id: "intro",
      icon: ShieldCheck,
      title: "Platform Role & Scope",
      content: (
        <p>
          ShopoApp is a marketplace facilitator. <strong>We do not sell or deliver physical goods directly.</strong> Refunds for products purchased are subject to the individual Wholesaler's policy and are generally handled at the time of delivery (COD). Refunds for ShopoApp membership subscriptions are governed by the terms below.
        </p>
      )
    },
    {
      id: "product-returns",
      icon: Truck,
      title: "Product Returns (COD Orders)",
      content: (
        <div className="space-y-4">
          <p>Since product payments are Cash on Delivery:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>On-Spot Rejection:</strong> Retailers are advised to check goods upon delivery. You may reject damaged or incorrect items immediately before payment.</li>
            <li><strong>Post-Delivery Returns:</strong> Once payment is made to the supplier/delivery agent, returns are handled directly between the Retailer and Wholesaler. ShopoApp can assist in facilitating communication but does not hold the funds to process refunds directly.</li>
          </ul>
        </div>
      )
    },
    {
      id: "subscription-refunds",
      icon: CreditCard,
      title: "Membership & Subscription Refunds",
      content: (
        <div className="space-y-4">
          <p>For payments made to ShopoApp for software tools (POS, Membership):</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Cancellation:</strong> You may cancel your subscription renewal at any time.</li>
            <li><strong>Refunds:</strong> Subscription fees are generally non-refundable for the current billing cycle. However, if there is a technical error or double charge, we will process a full refund within 7-10 business days.</li>
          </ul>
        </div>
      )
    },
    {
      id: "water-terms",
      icon: Droplet,
      title: "Water Delivery Specific Terms",
      content: (
        <p>
          For water jar deliveries, customers pay directly to the service provider. Any deposit refunds for jars are handled by the local water supplier, not ShopoApp.
        </p>
      )
    },
    {
      id: "contact",
      icon: Phone,
      title: "Dispute Support",
      content: (
        <div className="space-y-2">
          <p>If you face issues with a supplier refusing valid returns, contact our support team for mediation:</p>
          <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
            <p><strong>Email:</strong> <a href="mailto:support@shopoapp.com" className="text-blue-600 hover:underline">support@shopoapp.com</a></p>
            <p><strong>Address:</strong> Ninety Layers Enterprises, Sector-20, Airoli, Navi Mumbai 400708</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="ShopoApp Refund Policy for software subscriptions and guidelines for marketplace COD orders." />
      </Helmet>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4 tracking-tight">Refund & Cancellation Policy</h1>
          <p className="text-lg text-slate-600 font-medium">For Marketplace & Subscriptions</p>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <section.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl md:text-2xl text-slate-800">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 text-slate-600 leading-relaxed text-base">
                  {section.content}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RefundCancellationPolicy;