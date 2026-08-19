import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CalculatorButton = ({ 
  children, 
  onClick, 
  variant = 'default', 
  className,
  ...props 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'orange':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'secondary':
        return 'bg-gray-700 hover:bg-gray-600 text-white'; // Darker gray for functions like AC, %
      case 'operator':
        return 'bg-gray-800 hover:bg-gray-700 text-indigo-400 font-bold text-2xl'; // Dark gray with blue/indigo text for operators
      case 'default':
      default:
        return 'bg-gray-800 hover:bg-gray-700 text-white font-medium text-xl'; // Standard number buttons
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 select-none outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        getVariantClasses(),
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default CalculatorButton;