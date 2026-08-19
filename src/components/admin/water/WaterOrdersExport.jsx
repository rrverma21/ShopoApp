import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { format } from 'date-fns';

const WaterOrdersExport = ({ orders, sellerSummary }) => {
  const [exporting, setExporting] = useState(false);

  const downloadCSV = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportOrders = () => {
    setExporting(true);
    try {
      const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Phone', 'Address', 'Area', 'Product', 'Qty', 'Amount', 'Status', 'Seller Name', 'Seller Phone'];
      
      const rows = orders.map(order => [
        order.id,
        format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
        `"${order.customer_name || ''}"`,
        order.customer_phone || '',
        `"${order.customer_address || ''}"`,
        order.water_delivery_areas?.name || 'N/A',
        order.water_products?.name || 'N/A',
        order.quantity || 0,
        order.total_price || 0,
        order.status || 'Pending',
        `"${order.seller?.business_name || 'N/A'}"`,
        order.seller?.phone || 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      downloadCSV(csvContent, `water-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportSummary = () => {
    setExporting(true);
    try {
      const headers = ['Seller Name', 'Total Orders', 'Pending', 'Confirmed', 'Delivered', 'Cancelled', 'Total Revenue', 'Completion Rate'];
      
      const rows = sellerSummary.map(s => [
        `"${s.sellerName}"`,
        s.totalOrders,
        s.pending,
        s.confirmed,
        s.delivered,
        s.cancelled,
        s.revenue,
        `${s.completionRate}%`
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      downloadCSV(csvContent, `seller-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportOrders} 
        disabled={exporting || orders.length === 0}
        className="h-9"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
        Export Orders
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportSummary} 
        disabled={exporting || sellerSummary.length === 0}
        className="h-9"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
        Export Summary
      </Button>
    </div>
  );
};

export default WaterOrdersExport;