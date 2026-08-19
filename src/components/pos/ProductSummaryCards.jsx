import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Package, Layers, CircleDollarSign, TrendingUp, Percent, Coins, Receipt } from 'lucide-react';
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ProductSummaryCards = ({ products = [], fieldMapping = {} }) => {
    
    // Memoize calculations to avoid expensive re-loops on every render unless products change
    const summary = useMemo(() => {
        // Default fields if mapping is missing
        const fStock = fieldMapping.stock || 'stock_level';
        const fCost = fieldMapping.cost || 'cost_price';
        const fSale = fieldMapping.sale || 'selling_price';

        let totalCount = 0;
        let totalStock = 0;
        let totalCostVal = 0;
        let totalSaleVal = 0;
        let totalTaxAmount = 0;
        let totalTaxRateSum = 0;
        let validTaxCount = 0;

        products.forEach(p => {
            const stock = Number(p[fStock]) || 0;
            const cost = Number(p[fCost]) || 0;
            const sale = Number(p[fSale]) || 0;
            const taxRate = Number(p.tax_rate) || 0;

            totalCount++;
            totalStock += stock;
            totalCostVal += (stock * cost);
            totalSaleVal += (stock * sale);

            /**
             * Updated Tax Calculation Logic:
             * Only include products with stock > 0 when calculating 
             * total tax amount and average tax rate.
             */
            if (stock > 0 && p.tax_rate !== undefined && p.tax_rate !== null) {
                totalTaxAmount += (sale * taxRate / 100);
                totalTaxRateSum += taxRate;
                validTaxCount++;
            }
        });

        const profitVal = totalSaleVal - totalCostVal;
        // Avoid division by zero
        const profitMargin = totalCostVal > 0 ? ((profitVal / totalCostVal) * 100) : 0;
        const avgTaxRate = validTaxCount > 0 ? (totalTaxRateSum / validTaxCount) : 0;

        return {
            count: totalCount,
            stock: totalStock,
            costVal: totalCostVal,
            saleVal: totalSaleVal,
            profitVal: profitVal,
            profitPercent: profitMargin,
            taxAmount: totalTaxAmount,
            avgTaxRate: avgTaxRate
        };
    }, [products, fieldMapping]);

    const cards = [
        {
            title: "Products Count",
            value: summary.count,
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
            border: "border-blue-100 dark:border-blue-800"
        },
        {
            title: "Total Stock",
            value: summary.stock,
            icon: Layers,
            color: "text-orange-600",
            bg: "bg-orange-50 dark:bg-orange-900/20",
            border: "border-orange-100 dark:border-orange-800"
        },
        {
            title: "Inventory Cost",
            value: formatPrice(summary.costVal),
            icon: Coins,
            color: "text-slate-600",
            bg: "bg-slate-50 dark:bg-slate-800/50",
            border: "border-slate-200 dark:border-slate-700"
        },
        {
            title: "Sale Value",
            value: formatPrice(summary.saleVal),
            icon: CircleDollarSign,
            color: "text-indigo-600",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
            border: "border-indigo-100 dark:border-indigo-800"
        },
        {
            title: "Est. Profit",
            value: formatPrice(summary.profitVal),
            icon: TrendingUp,
            color: summary.profitVal >= 0 ? "text-emerald-600" : "text-red-600",
            bg: summary.profitVal >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20",
            border: summary.profitVal >= 0 ? "border-emerald-100 dark:border-emerald-800" : "border-red-100 dark:border-red-800"
        },
        {
            title: "Margin %",
            value: `${summary.profitPercent.toFixed(1)}%`,
            icon: Percent,
            color: summary.profitPercent >= 0 ? "text-emerald-600" : "text-red-600",
            bg: summary.profitPercent >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20",
            border: summary.profitPercent >= 0 ? "border-emerald-100 dark:border-emerald-800" : "border-red-100 dark:border-red-800"
        },
        {
            title: "Tax Summary",
            value: formatPrice(summary.taxAmount),
            subValue: `Avg Rate: ${summary.avgTaxRate.toFixed(1)}%`,
            icon: Receipt,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
            border: "border-purple-100 dark:border-purple-800"
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {cards.map((card, idx) => (
                <Card key={idx} className={cn("border shadow-sm backdrop-blur-sm bg-white/80 dark:bg-slate-950/50", card.border)}>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate mr-1">{card.title}</span>
                            <div className={cn("p-1.5 rounded-full shrink-0", card.bg)}>
                                <card.icon className={cn("w-3.5 h-3.5", card.color)} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className={cn("text-lg font-bold tracking-tight truncate", card.color)}>
                                {card.value}
                            </span>
                            {card.subValue && (
                                <span className="text-xs text-muted-foreground font-medium truncate">
                                    {card.subValue}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default ProductSummaryCards;