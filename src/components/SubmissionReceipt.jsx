import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const SubmissionReceipt = ({ data, onClose, type = 'contribution' }) => {
  if (!data) return null;

  const { status, id, created_at, product_name, barcode } = data;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto w-full"
    >
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800 shadow-lg">
        <CardHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="mx-auto bg-green-100 dark:bg-green-900/30 p-3 rounded-full w-fit mb-3"
          >
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>
          <CardTitle className="text-xl text-green-700 dark:text-green-400">
            {type === 'edit' ? 'Suggestion Received!' : 'Contribution Submitted!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Thank you for helping us improve our database. Your submission is now under review.
          </p>
          
          <div className="bg-white dark:bg-slate-950 rounded-lg p-4 text-left shadow-sm border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Reference ID:</span>
              <span className="font-mono font-medium">{id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Product:</span>
              <span className="font-medium truncate max-w-[150px]">{product_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Barcode:</span>
              <span className="font-mono">{barcode}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
              <span className="text-slate-500">Status:</span>
              <span className="flex items-center text-orange-600 dark:text-orange-400 font-medium">
                <Clock className="w-3 h-3 mr-1" /> Pending Review
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 text-white">
            Submit Another <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default SubmissionReceipt;