import React from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Loader2, AlertCircle } from 'lucide-react';

const CustomerPredictionList = ({ 
  results, 
  loading, 
  error, 
  onSelect, 
  selectedIndex,
  term 
}) => {
  // If no term, or (no results AND not loading AND no error), don't render anything
  if (!term || (results.length === 0 && !loading && !error)) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -5, height: 0 }} 
      animate={{ opacity: 1, y: 0, height: 'auto' }} 
      exit={{ opacity: 0, y: -5, height: 0 }} 
      transition={{ duration: 0.2 }}
      className="absolute top-full left-0 right-0 mt-1 bg-emerald-600 border border-emerald-500 rounded-lg shadow-xl z-50 overflow-hidden"
    >
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {error ? (
          <div className="p-3 text-sm text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load customers</span>
          </div>
        ) : loading ? (
          <div className="p-4 flex items-center justify-center text-emerald-50 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : results.length > 0 ? (
          results.map((customer, index) => (
            <div 
              key={customer.id} 
              className={`
                px-4 py-3 cursor-pointer border-b border-emerald-500 last:border-0 transition-colors
                ${index === selectedIndex ? 'bg-emerald-500' : 'hover:bg-emerald-700'}
              `}
              onMouseDown={(e) => { 
                e.preventDefault(); // Prevent input blur before click registers
                onSelect(customer); 
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white truncate">
                      {customer.name}
                    </span>
                    {customer.loyalty_points > 0 && (
                      <span className="text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                        {customer.loyalty_points} pts
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-emerald-50">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-emerald-50 text-sm">
            <p>No customers found for "{term}"</p>
            <p className="text-xs mt-1 text-emerald-100/80">Fill details to create new</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CustomerPredictionList;