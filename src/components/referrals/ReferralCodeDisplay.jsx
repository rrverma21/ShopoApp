import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle2, Share2, Mail, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ReferralCodeDisplay = ({ referralCode, isLoading }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: "Code Copied!",
        description: "Referral code copied to clipboard.",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the code.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (method) => {
    const message = `Join me on Shopo! Use my referral code ${referralCode} during registration.`;
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else if (method === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent('Invitation to join Shopo')}&body=${encodeURIComponent(message)}`;
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="referral-code-box group">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800">
              Your Unique Code
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="referral-copy-btn"
              onClick={handleCopy}
              disabled={isLoading || !referralCode}
              title="Copy Code"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Copy className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>

          <div className="referral-code-text">
            {isLoading ? (
              <span className="animate-pulse text-slate-300 dark:text-slate-700">LOADING...</span>
            ) : (
              referralCode || 'NO CODE'
            )}
          </div>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
            Share this code with your network. They must enter it during registration.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Button 
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-lg shadow-sm border-none flex items-center" 
              onClick={() => handleShare('whatsapp')}
              disabled={isLoading || !referralCode}
            >
              <Share2 className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
            <Button 
              className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-lg shadow-sm border-none flex items-center" 
              onClick={() => handleShare('email')}
              disabled={isLoading || !referralCode}
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralCodeDisplay;