import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProductPickerModal = ({ isOpen, onClose, products, selectedProductId, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - dims the page */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          
          {/* Modal/Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:rounded-2xl md:shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Select Product</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Choose from available options</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {products.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Droplets className="h-8 w-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-600 font-semibold">No products found</h4>
                  <p className="text-slate-400 text-sm">Please try again later.</p>
                </div>
              ) : (
                products.map((product) => {
                    const isSelected = selectedProductId === product.id;
                    return (
                        <motion.div
                            key={product.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            layout
                            onClick={() => {
                                onSelect(product.id);
                                onClose();
                            }}
                            className={cn(
                                "relative flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 min-h-[110px] group",
                                isSelected 
                                    ? "border-blue-500 bg-white shadow-lg shadow-blue-100 ring-1 ring-blue-500/20" 
                                    : "border-white bg-white hover:border-blue-200 shadow-sm hover:shadow-md"
                            )}
                        >
                            {/* Product Image */}
                            <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 mr-4 self-start mt-1">
                                {product.image_url ? (
                                    <img 
                                        src={product.image_url} 
                                        alt={product.name} 
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                                        <Droplets className="w-8 h-8" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 pr-8 py-1">
                                <h4 className={cn("font-bold text-base leading-snug mb-1.5", isSelected ? "text-blue-900" : "text-slate-900")}>
                                    {product.name}
                                </h4>
                                <p className="text-lg font-extrabold text-blue-600 mb-1.5 flex items-baseline gap-1">
                                    ₹{product.price}
                                    <span className="text-xs font-normal text-slate-400">/ unit</span>
                                </p>
                                {product.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {product.description}
                                    </p>
                                )}
                            </div>

                            {/* Selection Indicator */}
                            {isSelected ? (
                                <div className="absolute right-4 top-4">
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="bg-blue-600 text-white rounded-full p-1.5 shadow-md shadow-blue-200"
                                    >
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </motion.div>
                                </div>
                            ) : (
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="border-2 border-slate-200 rounded-full p-1.5">
                                        <div className="w-4 h-4" />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })
              )}
            </div>
            
            {/* Footer gradient fade */}
            <div className="h-6 bg-gradient-to-t from-white to-transparent pointer-events-none absolute bottom-0 left-0 right-0" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductPickerModal;