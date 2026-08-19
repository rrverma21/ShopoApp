import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpDown, ChevronDown, ChevronRight, User, Phone } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const WaterOrdersList = ({ orders, onUpdateStatus, onViewDetails }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  
  // Sorting logic
  const sortedOrders = [...orders].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    if (sortConfig.key === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
    }
    
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ columnKey }) => {
     if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
     return sortConfig.direction === 'asc' 
        ? <ChevronDown className="w-3 h-3 ml-1 text-blue-500 rotate-180 transition-transform" />
        : <ChevronDown className="w-3 h-3 ml-1 text-blue-500 transition-transform" />;
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch(s) {
        case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
        case 'accepted':
        case 'confirmed': return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">Confirmed</Badge>;
        case 'delivered':
        case 'completed': return <Badge variant="success" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Completed</Badge>;
        case 'cancelled': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">Cancelled</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (orders.length === 0) {
      return <div className="p-8 text-center text-slate-500">No orders found matching your filters.</div>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead className="w-[100px] font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>
                        <div className="flex items-center">Order ID <SortIcon columnKey="id" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort('created_at')}>
                        <div className="flex items-center">Date <SortIcon columnKey="created_at" /></div>
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center justify-end">Qty <SortIcon columnKey="quantity" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('total_price')}>
                        <div className="flex items-center justify-end">Amount <SortIcon columnKey="total_price" /></div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                         <div className="flex items-center justify-center">Status <SortIcon columnKey="status" /></div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-mono text-xs font-medium text-slate-500">
                            #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            {format(new Date(order.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm text-slate-900">{order.customer_name}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {order.customer_phone}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col max-w-[150px]">
                                <span className="font-medium text-sm text-slate-900 truncate" title={order.seller?.business_name}>
                                    {order.seller?.business_name || 'N/A'}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> {order.seller?.contact_person || 'N/A'}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{order.quantity}</TableCell>
                        <TableCell className="text-right font-bold text-slate-700">₹{order.total_price}</TableCell>
                        <TableCell className="text-center">
                            {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-right">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onViewDetails(order)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                             >
                                <Eye className="w-4 h-4" />
                             </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
};

export default WaterOrdersList;