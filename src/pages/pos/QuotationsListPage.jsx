import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotation } from '@/contexts/QuotationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QuotationsListPage = () => {
  const navigate = useNavigate();
  const { quotations, loading, fetchQuotations, deleteQuotation } = useQuotation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = q.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Draft': return <Badge variant="secondary">Draft</Badge>;
      case 'Sent': return <Badge className="bg-blue-500 hover:bg-blue-600">Sent</Badge>;
      case 'Accepted': return <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteQuotation(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-slate-500">Manage your estimates and proposals.</p>
        </div>
        <Button onClick={() => navigate('/pos/quotations/create')} className="gap-2">
          <Plus className="h-4 w-4" /> Create Quotation
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by customer or #..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading quotations...</TableCell>
              </TableRow>
            ) : filteredQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">No quotations found.</TableCell>
              </TableRow>
            ) : (
              filteredQuotations.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.quotation_number}</TableCell>
                  <TableCell>{format(new Date(q.quotation_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{q.customer?.name || 'Walk-in'}</TableCell>
                  <TableCell className="font-semibold">{formatPrice(q.grand_total)}</TableCell>
                  <TableCell>{getStatusBadge(q.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/pos/quotations/${q.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {q.status === 'Draft' && (
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/pos/quotations/${q.id}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(q.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quotation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuotationsListPage;