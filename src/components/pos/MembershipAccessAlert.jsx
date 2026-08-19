import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';

export default function MembershipAccessAlert() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-lg">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border max-w-md w-full">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Premium Feature Locked
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Please activate a Membership plan to access Products. Membership plans offer advanced POS features, unlimited product listings, regional customer access, and priority support to scale your business.
        </p>
        
        <Button 
          className="w-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 h-12 text-md"
          onClick={() => navigate('/pos/settings?tab=membership')}
        >
          <Crown className="w-5 h-5 fill-white/20" />
          Go to Membership Settings
        </Button>
      </div>
    </div>
  );
}