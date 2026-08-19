import React from 'react';
import { cn, useCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePosData } from '@/contexts/PosDataContext';
import { usePendingOrdersCount } from '@/hooks/useNewOrdersCount';

const OrderCountBadge = ({ className, amount }) => {
  const { businessId } = usePosData();
  const { pendingCount } = usePendingOrdersCount(businessId);
  const { symbol } = useCurrency();
  
  const count = amount !== undefined ? amount : pendingCount;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "bg-purple-500 text-white text-[10px] font-bold px-1.5 h-5 min-w-[1.25rem] rounded-full flex items-center justify-center shadow-sm absolute right-2 top-1/2 -translate-y-1/2 lg:static lg:translate-y-0 lg:ml-auto",
            className
          )}
        >
          {symbol}{count > 99 ? '99+' : count}
          <span className="absolute inset-0 rounded-full bg-purple-400 opacity-75 animate-ping z-[-1]" />
        </motion.span>
      )}
    </AnimatePresence>
  );
};

export default OrderCountBadge;