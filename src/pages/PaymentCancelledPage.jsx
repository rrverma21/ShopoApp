import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';

const PaymentCancelledPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>Payment Cancelled - B2B Nexus</title>
        <meta name="description" content="Your payment was cancelled." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl border-slate-200">
            <CardHeader className="text-center pt-8 pb-2">
              <div className="bg-orange-50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Payment Cancelled</CardTitle>
            </CardHeader>
            
            <CardContent className="text-center pb-8">
              <p className="text-slate-600 mb-2">
                You cancelled the payment process or the transaction timed out.
              </p>
              <p className="text-sm text-slate-500">
                No charges were made to your account. You can safely try again when you're ready.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-6 rounded-b-xl border-t border-slate-100">
              <Button 
                onClick={() => navigate('/membership-plans', { replace: true })} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => navigate('/dashboard', { replace: true })} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default PaymentCancelledPage;