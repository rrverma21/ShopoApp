import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDateToDDMMYYYY } from '@/lib/utils';
import { MoreHorizontal, Edit, Trash2, Eye, FileDown, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import UpdateBillForm from './UpdateBillForm';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useQuery } from '@tanstack/react-query';

const BillDetailsDialog = ({ bill, open, onOpenChange }) => {
    if (!bill) return null;
    
    const gstSlabs = [
        { rate: 5, amount: bill.gst_5_amount },
        { rate: 12, amount: bill.gst_12_amount },
        { rate: 18, amount: bill.gst_18_amount },
        { rate: 28, amount: bill.gst_28_amount },
    ].filter(slab => slab.amount > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bill Details</DialogTitle>
                    <DialogDescription>
                        Bill #{bill.bill_number || bill.id.substring(0, 8)} | Due: {formatDateToDDMMYYYY(bill.due_date)}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
                        <h4 className="font-semibold mb-2">Summary</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Taxable Value:</span><span>{formatPrice(bill.taxable_value)}</span></div>
                        {gstSlabs.map(slab => (
                             <div key={slab.rate} className="flex justify-between text-sm"><span className="text-muted-foreground">GST @ {slab.rate}%:</span><span>{formatPrice(slab.amount)}</span></div>
                        ))}
                        <hr className="my-1"/>
                        <div className="flex justify-between text-sm font-medium"><span className="text-muted-foreground">Total GST:</span><span>{formatPrice(bill.total_gst_amount)}</span></div>
                        <div className="flex justify-between text-lg font-bold"><span >Grand Total:</span><span>{formatPrice(bill.amount)}</span></div>
                    </div>
                     {bill.description && (
                        <div>
                            <h4 className="font-semibold">Notes</h4>
                            <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{bill.description}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};


const BillsTable = ({ bills, isLoading, categories, onBillUpdated, onBillDeleted }) => {
  const { toast } = useToast();
  const [billToUpdate, setBillToUpdate] = useState(null);
  const [billToDelete, setBillToDelete] = useState(null);
  const [billToView, setBillToView] = useState(null);

  const handleDelete = async () => {
    if (!billToDelete) return;

    try {
      if (billToDelete.receipt_url) {
        const filePath = billToDelete.receipt_url.split('/').slice(-2).join('/');
        await supabase.storage.from('dior-receipts').remove([filePath]);
      }
      
      const { error } = await supabase.from('dior_bills').delete().eq('id', billToDelete.id);
      if (error) throw error;
      toast({ title: "Bill deleted successfully!" });
      onBillDeleted();
    } catch (error) {
      toast({ title: 'Error deleting bill', description: error.message, variant: 'destructive' });
    } finally {
      setBillToDelete(null);
    }
  };

  const handleExport = (format) => {
    const doc = new jsPDF();
    let finalY = 20;

    doc.text("Bills Register", 14, 16);

    bills.forEach((bill, index) => {
        if (index > 0 && finalY > 250) {
            doc.addPage();
            finalY = 20;
        } else if (index > 0) {
            finalY += 10;
             doc.line(14, finalY, 200, finalY);
             finalY += 10;
        }

        doc.setFontSize(10);
        doc.text(`Bill #: ${bill.bill_number || 'N/A'}`, 14, finalY);
        doc.text(`Supplier: ${bill.supplier_name || 'N/A'}`, 14, finalY + 5);
        doc.text(`Due Date: ${formatDateToDDMMYYYY(bill.due_date)}`, 14, finalY + 10);
        doc.text(`Status: ${bill.status}`, 14, finalY + 15);
        finalY += 20;

        doc.autoTable({
            body: [
                ['Taxable Value', formatPrice(bill.taxable_value)],
                ['GST @ 5%', formatPrice(bill.gst_5_amount)],
                ['GST @ 12%', formatPrice(bill.gst_12_amount)],
                ['GST @ 18%', formatPrice(bill.gst_18_amount)],
                ['GST @ 28%', formatPrice(bill.gst_28_amount)],
                ['Total GST', formatPrice(bill.total_gst_amount)],
            ],
             startY: finalY,
             theme: 'grid'
        });
        finalY = doc.lastAutoTable.finalY;

        doc.setFont(undefined, 'bold');
        doc.text(`Grand Total: ${formatPrice(bill.amount)}`, 14, finalY + 8);
        doc.setFont(undefined, 'normal');
        finalY += 8;
    });

    if (format === 'pdf') {
        doc.save('bills_register.pdf');
    } else {
        const data = bills.map(bill => ({
            'Bill #': bill.bill_number || 'N/A', 'Supplier Name': bill.supplier_name || 'N/A', 'Description': bill.description, 'Category': bill.category?.name || bill.category, 'Amount': bill.amount, 'Due Date': formatDateToDDMMYYYY(bill.due_date), 'Status': bill.status, 'Taxable Value': bill.taxable_value, 'Total GST': bill.total_gst_amount
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bills");
        XLSX.writeFile(wb, "bills_register.xlsx");
    }
  };

  return (
    <div className="bg-card border rounded-lg">
      <div className="p-4 flex justify-end">
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF (Detailed)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7} className="h-12 text-center">Loading...</TableCell>
              </TableRow>
            ))
          ) : bills.length > 0 ? (
            bills.map(bill => (
              <TableRow key={bill.id}>
                <TableCell>
                  <div className="font-medium">{bill.description || bill.supplier_name || 'No description'}</div>
                  <div className="text-sm text-muted-foreground">{bill.bill_number || ''}</div>
                </TableCell>
                <TableCell>{bill.supplier_name || 'N/A'}</TableCell>
                <TableCell>{bill.category?.name || 'Uncategorized'}</TableCell>
                <TableCell className="text-right font-medium">{formatPrice(bill.amount)}</TableCell>
                <TableCell>{formatDateToDDMMYYYY(bill.due_date)}</TableCell>
                <TableCell>
                  <Badge variant={bill.status === 'paid' ? 'default' : 'secondary'} className={bill.status === 'paid' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => setBillToView(bill)}>
                            <Info className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBillToUpdate(bill)}>
                        <Edit className="mr-2 h-4 w-4" /> Update/Pay
                      </DropdownMenuItem>
                      {bill.receipt_url && (
                        <DropdownMenuItem asChild>
                           <a href={bill.receipt_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="mr-2 h-4 w-4" /> View Receipt
                            </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-500" onClick={() => setBillToDelete(bill)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">No bills found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {billToView && <BillDetailsDialog bill={billToView} open={!!billToView} onOpenChange={() => setBillToView(null)} />}

      <Dialog open={!!billToUpdate} onOpenChange={(isOpen) => !isOpen && setBillToUpdate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Bill</DialogTitle>
          </DialogHeader>
          {billToUpdate && (
            <UpdateBillForm
              bill={billToUpdate}
              categories={categories}
              onBillUpdated={() => {
                onBillUpdated();
                setBillToUpdate(null);
              }}
              onCancel={() => setBillToUpdate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!billToDelete} onOpenChange={(isOpen) => !isOpen && setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill and its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillsTable;