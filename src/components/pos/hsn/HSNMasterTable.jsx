import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Pencil, Trash2, ArrowUpDown, Plus, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const HSNMasterTable = ({ onAddClick, onEditClick, onApplyToCategory }) => {
  const { hsnCodes, loading, deleteHSN, fetchHSNCodes } = useHSNMaster();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [gstFilter, setGstFilter] = useState('all');
  const [sortBy, setSortBy] = useState('label');
  const [sortOrder, setSortOrder] = useState('asc');

  // Delete Dialog
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort data on client side
  const filteredAndSortedData = useMemo(() => {
    let result = [...(hsnCodes || [])];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.label?.toLowerCase() || '').includes(search) ||
        (item.hsn_code?.toLowerCase() || '').includes(search) ||
        (item.description?.toLowerCase() || '').includes(search)
      );
    }

    // Apply GST filter
    if (gstFilter !== 'all') {
      const targetGst = parseFloat(gstFilter);
      result = result.filter(item => item.gst_percentage === targetGst);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle null/undefined
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Convert to lowercase for string comparison
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [hsnCodes, searchTerm, gstFilter, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const { success, error } = await deleteHSN(itemToDelete.id);
    if (success) {
      toast.success('HSN deleted successfully');
      setItemToDelete(null);
    } else {
      toast.error(error || 'Failed to delete HSN');
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code or label..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={gstFilter} onValueChange={setGstFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="GST Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rates</SelectItem>
              <SelectItem value="0">0% GST</SelectItem>
              <SelectItem value="5">5% GST</SelectItem>
              <SelectItem value="12">12% GST</SelectItem>
              <SelectItem value="18">18% GST</SelectItem>
              <SelectItem value="28">28% GST</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('label')} className="flex items-center gap-1 font-semibold -ml-4 px-4 hover:bg-transparent">
                    Label <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('hsn_code')} className="flex items-center gap-1 font-semibold -ml-4 px-4 hover:bg-transparent">
                    HSN Code <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('gst_percentage')} className="flex items-center gap-1 font-semibold -ml-4 px-4 hover:bg-transparent">
                    GST % <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <p className="mb-4">
                        {searchTerm || gstFilter !== 'all' ? 'No HSN codes match your filters' : 'No HSN codes found'}
                      </p>
                      <Button onClick={onAddClick} variant="outline" className="border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Create First HSN
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.label}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{item.hsn_code || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.gst_percentage || 0}%</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[250px] truncate text-muted-foreground" title={item.description}>
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onApplyToCategory && onApplyToCategory({
                                  id: item.id,
                                  code: item.hsn_code,
                                  label: item.label,
                                  gstRate: item.gst_percentage
                                })} 
                                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                              >
                                <Layers className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Apply this HSN to all products in a category</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button variant="ghost" size="icon" onClick={() => onEditClick(item)} className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete HSN Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.label || itemToDelete?.hsn_code}</strong>? 
              This action cannot be undone. If it is assigned to categories or products, the deletion will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HSNMasterTable;