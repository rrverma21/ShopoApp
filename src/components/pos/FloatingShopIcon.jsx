import React from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const FloatingShopIcon = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
        "shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50",
        "transition-all duration-300",
        "md:bottom-8 md:right-8"
      )}
      aria-label="Open POS Inventory"
    >
      <Package className="h-7 w-7" />
    </motion.button>
  );
};

export default FloatingShopIcon;