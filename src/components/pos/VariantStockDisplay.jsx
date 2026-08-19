import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VariantStockDisplay = ({ variants, compact = false }) => {
    if (!variants || variants.length === 0) return null;

    return (
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
            {variants.map((variant, idx) => {
                const stock = parseInt(variant.stock) || 0;
                let statusColor = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
                let statusText = "In Stock";

                if (stock <= 0) {
                    statusColor = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
                    statusText = "Out of Stock";
                } else if (stock < 5) {
                    statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
                    statusText = "Low Stock";
                }

                return (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex flex-col min-w-0 mr-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {variant.name}
                            </span>
                            {variant.barcode && (
                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                    {variant.barcode}
                                </span>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap h-5 px-1.5", statusColor)}>
                                {stock} {statusText === "Out of Stock" ? "" : "left"}
                            </Badge>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VariantStockDisplay;