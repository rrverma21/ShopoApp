import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { FileText, Shield, UserCheck, AlertTriangle, CreditCard, Truck, Scale, RefreshCw, Mail, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TermsOfService = () => {
  const sections = [
    {
      id: "platform-nature",
      title: "1. Platform Nature & Role",
      icon: Building2,
      content: (
        <p>
          ShopoApp (operated by <strong>Ninety Layers Enterprises</strong>) acts exclusively as a <strong>technology facilitator and marketplace platform</strong>. We are not the seller of physical goods listed on the wholesale marketplace. We provide the digital infrastructure for independent wholesalers to list products and for retailers to connect with them. All product sale contracts are strictly between the Buyer (Retailer) and the Seller (Wholesaler).
        </p>
      )
    },
    {
      id: "acceptance",
      title: "2. Acceptance of Terms",
      icon: FileText,
      content: (
        <p>
          By accessing or using the ShopoApp platform, you agree to be bound by these Terms. If you do not agree, you must not access our Services. These Terms constitute a legally binding agreement between you and Ninety Layers Enterprises.
        </p>
      )
    },
    {
      id: "payment-model",
      title: "3. Payment Terms",
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <p>Our platform operates on a distinct dual-payment model:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700 dark:text-slate-300">
            <li><strong>Membership & Software Fees:</strong> Payments for platform subscription, POS software access, and premium features are made online to ShopoApp via secure gateways (e.g., Paytm, Razorpay).</li>
            <li><strong>Product Purchases:</strong> Payments for physical goods ordered from wholesalers are settled via <strong>Cash on Delivery (COD)</strong> directly between the buyer and the supplier/delivery partner. ShopoApp does not collect funds for product sales online.</li>
          </ul>
        </div>
      )
    },
    {
      id: "responsibilities",
      title: "4. Wholesaler & Retailer Responsibilities",
      icon: UserCheck,
      content: (
        <div className="space-y-4">
          <p><strong>Wholesalers:</strong> Are responsible for the quality, authenticity, and delivery of products listed. They must honor the prices listed and fulfill accepted COD orders.</p>
          <p><strong>Retailers:</strong> Are responsible for verifying goods upon delivery before making payment. Rejection of goods without valid cause may lead to account suspension.</p>
        </div>
      )
    },
    {
      id: "delivery",
      title: "5. Delivery & Fulfillment",
      icon: Truck,
      content: (
        <p>
          Delivery of physical goods is managed by the respective Wholesaler or their designated logistics partners. ShopoApp is not liable for delays, damages, or non-delivery of physical goods, though we may assist in dispute resolution.
        </p>
      )
    },
    {
      id: "liability",
      title: "6. Limitation of Liability",
      icon: AlertTriangle,
      content: (
        <p>
          Ninety Layers Enterprises is not liable for any product defects, warranty claims, or disputes arising from the sale of physical goods. Our liability is limited to the provision of the software platform and subscription services.
        </p>
      )
    },
    {
      id: "dispute",
      title: "7. Dispute Resolution",
      icon: Scale,
      content: (
        <p>
          Disputes regarding product quality or delivery must be raised directly with the supplier. ShopoApp may intervene as a mediator but does not guarantee outcomes. Disputes related to software subscriptions will be handled by our support team. Legal disputes are subject to the jurisdiction of courts in Mumbai, India.
        </p>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 font-sans">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Read the Terms of Service for ShopoApp. Understand the rules, obligations, and guidelines for using our B2B POS billing and marketplace platform." />
      </Helmet>

      {/* Header */}
      <section className="relative py-20 overflow-hidden bg-slate-900 text-white">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Terms of Service</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              ShopoApp is a marketplace platform facilitated by Ninety Layers Enterprises. Please read our terms regarding platform usage and B2B transactions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid gap-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
            >
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden bg-white dark:bg-slate-900">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                      <section.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-4 flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{section.title}</h2>
                      <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-xl">
              <CardContent className="p-8 md:p-12 text-center">
                <Mail className="w-12 h-12 mx-auto mb-6 text-blue-200" />
                <h2 className="text-3xl font-bold mb-4">Questions about our Terms?</h2>
                <div className="inline-flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <p className="font-semibold text-lg mb-1">Ninety Layers Enterprises Legal Dept.</p>
                  <a href="mailto:legal@shopoapp.com" className="text-blue-200 hover:text-white transition-colors text-lg">legal@shopoapp.com</a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;