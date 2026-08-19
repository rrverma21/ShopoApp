import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Download, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryTracking } from '@/hooks/useInventoryTracking';
import InventoryTrackingFilters from './InventoryTrackingFilters';
import InventoryTrackingTable from './InventoryTrackingTable';

const InventoryTrackingTab = ({ productId, currentStock }) => {
    const { data, loading, error, refetch } = useInventoryTracking(productId, currentStock);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(item => {
            // Type filter
            if (filterType !== 'All' && item.type !== filterType) return false;
            
            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesSearch = 
                    (item.billNumber && item.billNumber.toLowerCase().includes(term)) ||
                    (item.customerName && item.customerName.toLowerCase().includes(term)) ||
                    (item.customerPhone && item.customerPhone.toLowerCase().includes(term));
                if (!matchesSearch) return false;
            }

            // Date filter
            if (dateFrom) {
                if (new Date(item.date) < new Date(dateFrom)) return false;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999); // Include entire day
                if (new Date(item.date) > toDate) return false;
            }

            return true;
        });
    }, [data, searchTerm, filterType, dateFrom, dateTo]);

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        const exportData = filteredData.map(item => ({
            'Date': format(new Date(item.date), 'yyyy-MM-dd HH:mm:ss'),
            'Transaction Type': item.type,
            'Bill/Invoice Number': item.billNumber,
            'Customer Name': item.customerName,
            'Customer Phone': item.customerPhone,
            'Quantity': item.type === 'Stock Addition' ? `+${item.quantity}` : `-${item.quantity}`,
            'Previous Stock': item.previousStock ?? 'N/A',
            'New Stock': item.newStock ?? 'N/A',
            'Notes': item.notes
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory Tracking');
        
        const fileName = `Inventory_Tracking_${productId}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/10 rounded-lg text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Failed to load tracking data</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                </div>
                <Button variant="outline" onClick={refetch} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden space-y-4">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Inventory Tracking</h3>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportCSV} 
                    disabled={loading || filteredData.length === 0}
                    className="gap-2"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </Button>
            </div>

            <InventoryTrackingFilters 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterType={filterType}
                setFilterType={setFilterType}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
            />

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-4">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="w-full h-10 rounded-md" />
                        <Skeleton className="w-full h-12 rounded-md" />
                        <Skeleton className="w-full h-12 rounded-md" />
                        <Skeleton className="w-full h-12 rounded-md" />
                    </div>
                ) : (
                    <InventoryTrackingTable data={filteredData} />
                )}
            </div>
        </div>
    );
};

export default InventoryTrackingTab;