import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Briefcase } from 'lucide-react';
import { usePOSMode } from '@/contexts/POSModeContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const POSModeSwitch = ({ className }) => {
    const { billingMode, toggleMode, isHybrid, userPlanCategory } = usePOSMode();

    if (!isHybrid) {
        return (
            <div className={cn("flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm", className)}>
                {billingMode === 'wholesale' ? (
                    <Briefcase className="w-4 h-4 text-purple-600" />
                ) : (
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                    {billingMode} Mode
                </span>
                <span className="text-[10px] text-slate-500 ml-1">({userPlanCategory})</span>
            </div>
        );
    }

    return (
        <div className={cn("relative flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner w-fit", className)} role="radiogroup" aria-label="Billing Mode Switch">
            <button
                role="radio"
                aria-checked={billingMode === 'retail'}
                onClick={() => toggleMode('retail')}
                className={cn(
                    "relative flex items-center justify-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 z-10 w-32",
                    billingMode === 'retail' ? "text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
            >
                <ShoppingCart className="w-4 h-4" />
                <span>Retail</span>
            </button>

            <button
                role="radio"
                aria-checked={billingMode === 'wholesale'}
                onClick={() => toggleMode('wholesale')}
                className={cn(
                    "relative flex items-center justify-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 z-10 w-32",
                    billingMode === 'wholesale' ? "text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
            >
                <Briefcase className="w-4 h-4" />
                <span>Wholesale</span>
            </button>

            {/* Sliding Background */}
            <motion.div
                className={cn(
                    "absolute top-1 bottom-1 w-32 rounded-full shadow-md z-0",
                    billingMode === 'retail' 
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                        : "bg-gradient-to-r from-purple-500 to-fuchsia-600"
                )}
                initial={false}
                animate={{
                    left: billingMode === 'retail' ? 4 : 132,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
        </div>
    );
};

export default POSModeSwitch;