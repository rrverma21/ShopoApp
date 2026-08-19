import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, RefreshCw, AlertTriangle, Building2, Lock, ArrowRight, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentPolicyPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Understand how payments, payouts, and refunds work on ShopoApp. Transparent and secure transactions via secure payment gateways." />
      </Helmet>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Payment Policy & Process</h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            ShopoApp ensures secure, transparent, and efficient transactions for all our partners. 
            We utilize <strong>Paytm Payment Gateway</strong> for reliable processing.
          </p>
        </motion.div>

        <div className="grid gap-8">
          {/* Payment Methods */}
          <Card className="border-none shadow-md">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-slate-800">Payment Collection</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 text-slate-600 leading-relaxed">
              <p className="mb-4">
                Payments on ShopoApp are collected securely through our trusted third-party processor, <strong>Paytm Payment Gateway</strong>. This ensures that your financial data is encrypted and handled with the highest security standards.
              </p>
              <h4 className="font-semibold text-slate-800 mb-2">Accepted Payment Methods:</h4>
              <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>UPI (Paytm, Google Pay, PhonePe, BHIM)</li>
                <li>Credit & Debit Cards (Visa, Mastercard, Rupay, Amex)</li>
                <li>Net Banking (All major Indian banks)</li>
                <li>Wallets (Paytm Wallet)</li>
              </ul>
              <p className="text-sm text-slate-500 italic">
                *Zyvora Technologies Pvt. Ltd. appears on your bank statement for all transactions.
              </p>
            </CardContent>
          </Card>

          {/* Payouts to Sellers */}
          <Card className="border-none shadow-md">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <Wallet className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-slate-800">Seller Payouts & Settlements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 text-slate-600 leading-relaxed">
              <p className="mb-4">
                For sellers and wholesalers listed on ShopoApp, payouts are processed automatically via direct bank transfer or Paytm settlement systems.
              </p>
              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">Settlement Timeline:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 mt-1 text-blue-500" />
                    <span><strong>T+1 Settlement:</strong> Standard payments are settled to the seller's registered bank account within 24 hours of successful order delivery confirmation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 mt-1 text-blue-500" />
                    <span><strong>Instant Settlement:</strong> Eligible sellers may qualify for instant settlements depending on their transaction history and Paytm's risk assessment.</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Refunds & Security */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-md">
              <CardHeader className="bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg text-slate-800">Refunds & Disputes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 text-slate-600 leading-relaxed">
                <p className="mb-3">Refunds are processed back to the original source payment method.</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>Bank/Card Refunds:</strong> 5-7 business days.</li>
                  <li><strong>UPI/Wallet Refunds:</strong> 24-48 hours.</li>
                  <li>In case of disputes, amounts may be held in escrow until resolution.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg text-slate-800">Security Assurance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 text-slate-600 leading-relaxed">
                <p className="mb-3">Your security is paramount.</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>PCI-DSS Compliant:</strong> Our payment partners meet global security standards.</li>
                  <li><strong>SSL Encryption:</strong> All data transmission is encrypted via 256-bit SSL.</li>
                  <li><strong>Fraud Protection:</strong> Real-time monitoring for suspicious activities.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center border-t pt-8">
            <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4" />
              Payments are processed by Zyvora Technologies Pvt. Ltd.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPolicyPage;