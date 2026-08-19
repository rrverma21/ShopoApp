import React from 'react';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const InventoryTrackingTable = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500 border rounded-lg bg-slate-50 dark:bg-slate-900 border-dashed">
                <p className="font-medium text-slate-600 dark:text-slate-400">No inventory transactions found</p>
                <p className="text-sm mt-1">Try adjusting your filters to see more results.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-950">
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[65vh]">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="whitespace-nowrap">Date</TableHead>
                            <TableHead className="whitespace-nowrap">Type</TableHead>
                            <TableHead className="whitespace-nowrap">Bill/Invoice</TableHead>
                            <TableHead className="whitespace-nowrap">Customer Info</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Qty</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Prev. Stock</TableHead>
                            <TableHead className="text-right whitespace-nowrap">New Stock</TableHead>
                            <TableHead className="whitespace-nowrap">Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow 
                                key={row.id} 
                                className={row.type === 'Stock Addition' ? 'inventory-row-addition' : 'inventory-row-sale'}
                            >
                                <TableCell className="font-medium whitespace-nowrap text-sm">
                                    {format(new Date(row.date), 'dd MMM yyyy, HH:mm')}
                                </TableCell>
                                <TableCell>
                                    <Badge 
                                        variant="outline" 
                                        className={`flex items-center gap-1 w-max ${
                                            row.type === 'Stock Addition' 
                                            ? 'text-green-700 bg-green-100/50 border-green-200 dark:text-green-400 dark:bg-green-900/30' 
                                            : 'text-red-700 bg-red-100/50 border-red-200 dark:text-red-400 dark:bg-red-900/30'
                                        }`}
                                    >
                                        {row.type === 'Stock Addition' ? (
                                            <ArrowUpCircle className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownCircle className="w-3 h-3" />
                                        )}
                                        {row.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{row.billNumber}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{row.customerName}</span>
                                        {row.customerPhone !== '-' && (
                                            <span className="text-xs text-slate-500">{row.customerPhone}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                    <span className={row.type === 'Stock Addition' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {row.type === 'Stock Addition' ? '+' : '-'}{row.quantity}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right text-slate-500 font-mono text-sm">
                                    {row.previousStock ?? '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-sm">
                                    {row.newStock ?? '-'}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                                    {row.notes}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default InventoryTrackingTable;