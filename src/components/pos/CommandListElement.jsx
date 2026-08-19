import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Check } from 'lucide-react';

const CommandListElement = ({ results, onSelect, selectedIndex, showCostPrice = false }) => {
  const selectedRef = useRef(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="max-h-[350px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-1.5 z-50">
        {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No products found.</div>
        ) : (
            <div className="flex flex-col gap-1">
                {results.map((product, index) => {
                    const isSelected = index === selectedIndex;
                    
                    return (
                        <div 
                            key={`${product.id}-${index}`}
                            ref={isSelected ? selectedRef : null}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150 relative group
                                ${isSelected 
                                    ? 'bg-blue-600 text-white shadow-md scale-[1.01] font-semibold' 
                                    : 'bg-transparent text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                                }
                            `}
                            onClick={() => onSelect(product)}
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from input
                        >
                            {/* Product Details */}
                            <div className="flex-grow min-w-0 flex flex-col justify-center">
                                <div className="flex items-center justify-between gap-2">
                                    {/* Product Name (Full, no truncation) */}
                                    <span className={`text-sm leading-tight break-words pr-2 ${isSelected ? 'text-white font-bold' : 'text-gray-900 dark:text-gray-100 font-semibold'}`}>
                                        {product.name}
                                    </span>
                                </div>
                                {/* Stock Status */}
                                <div className={`flex items-center gap-2 text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {product.stock_level !== null && product.stock_level !== undefined ? (
                                        product.stock_level <= (product.low_stock_threshold || 0) && !product.is_service ? (
                                            <Badge className={`${isSelected ? 'bg-red-500 text-white border-red-400' : 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}>
                                                Low Stock: {product.stock_level}
                                            </Badge>
                                        ) : (
                                            !product.is_service && <span className={`${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>Stock: {product.stock_level}</span>
                                        )
                                    ) : (
                                        product.is_service ? (
                                            <span className={`${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>Service</span>
                                        ) : (
                                            <span className={`${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>Stock: N/A</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Price & Action */}
                            <div className="text-right shrink-0 flex flex-col items-end justify-center min-w-[70px]">
                                <div className={`text-base font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {formatPrice(product.selling_price)}
                                </div>
                                {showCostPrice && (
                                    <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                                        Cost: {formatPrice(product.cost_price)}
                                    </div>
                                )}
                            </div>

                            {/* Visual Selected Indicator */}
                            {isSelected && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full p-0.5 shadow-sm border border-blue-200">
                                    <Check className="w-3 h-3 text-blue-600" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};

export default CommandListElement;