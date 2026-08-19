import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ShippingPolicyPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Information about delivery areas, shipping timelines, costs, and order tracking on the ShopoApp platform." />
      </Helmet>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Shipping & Delivery Policy</h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Efficient logistics are the backbone of our B2B network. Here's how we ensure your orders reach you safely and on time.
          </p>
        </motion.div>

        <div className="space-y-8">
          <Card className="border-none shadow-md">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-slate-800">Coverage Areas & Zones</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 text-slate-600">
              <p className="mb-4">
                ShopoApp currently operates primarily in the <strong>Mumbai Metropolitan Region (MMR)</strong>, with a strong focus on:
              </p>
              <ul className="grid md:grid-cols-2 gap-2 list-disc pl-5 mb-4">
                <li>Navi Mumbai (Airoli, Ghansoli, Kopar Khairane, Vashi)</li>
                <li>Thane & Mulund</li>
                <li>Central Mumbai Suburbs</li>
                <li>Panvel & Raigad District</li>
              </ul>
              <p className="text-sm text-slate-500">
                *Service availability is determined by pincode. Check availability on the product page or cart before checkout.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <Clock className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-slate-800">Delivery Timelines & Charges</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 text-slate-600">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Estimated Delivery Time</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Local Retail Orders:</strong> Same-day or Next-day delivery (within 24 hours).</li>
                    <li><strong>Wholesale/Bulk Orders:</strong> 2-3 Business Days depending on volume.</li>
                    <li><strong>Water Delivery:</strong> Scheduled time slots as selected during checkout.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Shipping Charges</h4>
                  <ul className="space-y-2 text-sm">
                    <li>Shipping costs vary based on order weight, dimensions, and distance.</li>
                    <li><strong>Free Shipping:</strong> Available for orders above ₹20,000 within standard delivery zones.</li>
                    <li>Exact shipping fees are calculated and displayed at checkout.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Package className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-slate-800">Tracking & Logistics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 text-slate-600">
              <p className="mb-4">
                We partner with dedicated local riders and professional logistics services to handle deliveries.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Real-time Tracking:</strong> Once dispatched, you can track your order via the 'My Orders' section in the app.</li>
                <li><strong>Status Updates:</strong> You will receive SMS/WhatsApp notifications for: Order Confirmation, Dispatch, Out for Delivery, and Delivered.</li>
                <li><strong>Delivery Partners:</strong> Our fleet includes verified independent riders and partnerships with local transport agencies for bulk goods.</li>
              </ul>
            </CardContent>
          </Card>

          <div className="bg-red-50 border border-red-100 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-red-700 mb-1">Damaged or Lost Packages</h4>
              <p className="text-red-600 text-sm">
                In the rare event that your package is lost or arrives damaged, please report it immediately (within 24 hours of delivery status update). 
                Contact support at <strong>support@shopoapp.com</strong> or via the in-app Help section. We will investigate and initiate a refund or replacement as per our Refund Policy.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-slate-500 text-sm">
            <p>Operations Office: Sector-20, Airoli, Navi Mumbai 400708</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShippingPolicyPage;