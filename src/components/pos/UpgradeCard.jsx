import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Crown, ArrowRight, Zap } from 'lucide-react';
import UpgradeRequestModal from './UpgradeRequestModal';

const UpgradeCard = ({ currentProducts, maxProducts, planName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const percentage = Math.min(100, (currentProducts / maxProducts) * 100);

  return (
    <>
      <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-950 mb-6">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-inner shadow-white/20">
            <Crown className="w-8 h-8 text-white" />
          </div>
          
          <div className="flex-grow space-y-3 w-full text-center md:text-left">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-center md:justify-start gap-2">
                Product Limit Reached <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                You've reached your {planName || 'Free'} Plan limit. Upgrade to Premium for unlimited products and advanced features.
              </p>
            </div>
            
            <div className="space-y-1.5 max-w-md mx-auto md:mx-0">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-700 dark:text-slate-200">Storage Used</span>
                <span className="text-indigo-600 dark:text-indigo-400">{currentProducts} / {maxProducts} Products</span>
              </div>
              <Progress value={percentage} className="h-2.5 bg-slate-200 dark:bg-slate-700" indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500" />
            </div>
          </div>
          
          <div className="flex-shrink-0 w-full md:w-auto">
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300 gap-2 h-12 px-8"
            >
              Upgrade Now <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <UpgradeRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        currentPlan={planName}
        currentProducts={currentProducts}
        maxProducts={maxProducts}
      />
    </>
  );
};

export default UpgradeCard;