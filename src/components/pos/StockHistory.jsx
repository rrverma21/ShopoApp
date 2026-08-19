import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, FileDown, History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { utils, writeFile } from "xlsx";
import { cn } from "@/lib/utils";
import CustomDatePicker from "@/components/CustomDatePicker";

const StockHistory = ({ productId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [sourceFilter, setSourceFilter] = useState('All');
    const [billNoFilter, setBillNoFilter] = useState('');
    const [dateRange, setDateRange] = useState(null);

    useEffect(() => {
        if (productId) {
            fetchLogs();
            
            // Set up real-time subscription for stock_logs table
            const subscription = supabase
                .channel(`stock_logs_${productId}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'stock_logs',
                    filter: `product_id=eq.${productId}` 
                }, () => {
                    fetchLogs();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [productId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_logs')
                .select(`
                    *,
                    updater:profiles!stock_logs_user_id_fkey(contact_person, business_name),
                    purchase_bill:purchase_bills!stock_logs_purchase_bill_id_fkey(
                        bill_no,
                        bill_date,
                        suppliers (
                            name
                        )
                    )
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching stock logs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Derived properties for display
    const processLogs = (rawLogs) => {
        return rawLogs.map(log => {
            const isPurchaseBill = !!log.purchase_bill_id || !!log.purchase_bill;
            let source = isPurchaseBill ? 'Purchase Bill' : 'Manual';
            let billRef = '';
            
            if (isPurchaseBill && log.purchase_bill) {
                const supplierName = log.purchase_bill.suppliers?.name || 'Unknown Supplier';
                const billDateStr = log.purchase_bill.bill_date ? format(new Date(log.purchase_bill.bill_date), "MMM d, yyyy") : '';
                billRef = `PB-${log.purchase_bill.bill_no} (${supplierName}) - ${billDateStr}`;
            } else {
                const updaterName = log.updater?.contact_person || log.updater?.business_name || 'System';
                billRef = `Manual Update (${updaterName})`;
            }

            return {
                ...log,
                source,
                billRef,
                updaterName: log.updater?.contact_person || log.updater?.business_name || "Unknown"
            };
        });
    };

    // Apply filters
    const processedLogs = processLogs(logs);
    const filteredLogs = processedLogs.filter(log => {
        if (sourceFilter !== 'All' && log.source !== sourceFilter) return false;
        if (billNoFilter && !log.billRef.toLowerCase().includes(billNoFilter.toLowerCase())) return false;
        if (dateRange) {
            const logDate = new Date(log.created_at).setHours(0,0,0,0);
            const filterDate = new Date(dateRange).setHours(0,0,0,0);
            if (logDate !== filterDate) return false;
        }
        return true;
    });

    const handleExport = () => {
        if (!filteredLogs.length) return;
        const data = filteredLogs.map(log => ({
            "Date": format(new Date(log.created_at), "yyyy-MM-dd HH:mm"),
            "Variant": log.variant_name || "N/A",
            "Previous Stock": log.previous_stock,
            "Added/Changed": log.added_stock,
            "New Stock": log.new_stock,
            "Source": log.source,
            "Bill Reference": log.billRef,
            "Updated By": log.updaterName,
            "Notes/Reason": log.reason || ""
        }));
        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Stock History");
        writeFile(wb, `stock_history_${productId}.xlsx`);
    };

    if (loading && !logs.length) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="w-[160px] bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Sources</SelectItem>
                            <SelectItem value="Manual">Manual</SelectItem>
                            <SelectItem value="Purchase Bill">Purchase Bill</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input 
                            placeholder="Search bill reference..." 
                            className="pl-9 bg-white dark:bg-slate-950"
                            value={billNoFilter}
                            onChange={(e) => setBillNoFilter(e.target.value)}
                        />
                    </div>

                    <div className="w-full sm:max-w-[160px]">
                        <CustomDatePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Filter by Date"
                        />
                    </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0 bg-white dark:bg-slate-950">
                    <FileDown className="mr-2 h-4 w-4" /> Export
                </Button>
            </div>
            
            {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg border-dashed">
                    <History className="h-8 w-8 mb-2 opacity-50" />
                    <p>No stock update history found.</p>
                </div>
            ) : (
                <div className="rounded-md border bg-white dark:bg-slate-950 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[140px]">Date</TableHead>
                                <TableHead>Variant</TableHead>
                                <TableHead className="text-right">Prev</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                                <TableHead className="text-right">New</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Bill Reference</TableHead>
                                <TableHead>Updated By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {log.variant_name ? <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border text-slate-600 dark:text-slate-300">{log.variant_name}</span> : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">{log.previous_stock}</TableCell>
                                    <TableCell className={cn("text-right font-bold text-xs", log.added_stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                        {log.added_stock > 0 ? "+" : ""}{log.added_stock}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-xs">{log.new_stock}</TableCell>
                                    <TableCell className="text-xs">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                                            log.source === 'Purchase Bill' 
                                                ? "bg-[hsl(var(--badge-pb-bg))] text-[hsl(var(--badge-pb-text))] border-[hsl(var(--badge-pb-border))]" 
                                                : "bg-[hsl(var(--badge-manual-bg))] text-[hsl(var(--badge-manual-text))] border-[hsl(var(--badge-manual-border))]"
                                        )}>
                                            {log.source}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs max-w-[200px] truncate" title={log.billRef}>
                                        {log.billRef}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {log.updaterName}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default StockHistory;