import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Store } from 'lucide-react';

const BusinessInfoHeader = () => {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('My Store');

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user.posOwnerId || user.id)
        .maybeSingle();
        
      if (profile?.business_name) {
        setBusinessName(profile.business_name);
      }
    };
    
    fetchBusinessInfo();
  }, [user]);

  return (
    <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900 shrink-0">
      <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
        <Store className="h-5 w-5 text-white" />
      </div>
      <div className="overflow-hidden">
        <h2 className="text-white font-bold truncate text-base leading-tight" title={businessName}>
          {businessName}
        </h2>
        <p className="text-blue-400 font-medium text-xs truncate mt-0.5">
          POS Terminal
        </p>
      </div>
    </div>
  );
};

export default BusinessInfoHeader;