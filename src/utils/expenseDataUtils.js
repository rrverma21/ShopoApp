import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { isValidDate } from './dateUtils';

export const fetchExpenses = async (userId, filters = {}) => {
  if (!userId) return [];

  // 1. Fetch Purchase Bills
  let pbQuery = supabase
    .from('purchase_bills')
    .select(`*, suppliers (name)`)
    .eq('user_id', userId)
    .eq('payment_status', 'Paid')
    .order('bill_date', { ascending: false });

  if (filters.startDate && isValidDate(filters.startDate)) pbQuery = pbQuery.gte('bill_date', startOfDay(new Date(filters.startDate)).toISOString());
  if (filters.endDate && isValidDate(filters.endDate)) pbQuery = pbQuery.lte('bill_date', endOfDay(new Date(filters.endDate)).toISOString());

  // 2. Fetch Custom Expenses
  let ceQuery = supabase
    .from('custom_expenses')
    .select('*')
    .eq('seller_id', userId)
    .order('expense_date', { ascending: false });

  if (filters.startDate && isValidDate(filters.startDate)) ceQuery = ceQuery.gte('expense_date', filters.startDate);
  if (filters.endDate && isValidDate(filters.endDate)) ceQuery = ceQuery.lte('expense_date', filters.endDate);

  const [pbResult, ceResult] = await Promise.all([pbQuery, ceQuery]);

  if (pbResult.error) console.error('Error fetching purchase bills:', pbResult.error);
  if (ceResult.error) console.error('Error fetching custom expenses:', ceResult.error);

  const pbData = (pbResult.data || []).map(bill => ({
    id: bill.id,
    expense_type: 'Purchase Bill',
    bill_no: bill.bill_no || 'N/A',
    date: bill.bill_date,
    vendor_name: bill.suppliers?.name || 'Unknown Supplier',
    description: bill.notes || 'Purchase Bill',
    total_amount: Number(bill.total_amount) || 0,
    gst_amount: (Number(bill.cgst_total) || 0) + (Number(bill.sgst_total) || 0),
    payment_date: bill.updated_at,
    payment_method: 'Bank Transfer',
    payment_status: 'Paid',
    category: 'Inventory Purchase',
    notes: bill.notes || '',
    subtotal: Number(bill.subtotal) || 0,
    originalData: bill
  }));

  const ceData = (ceResult.data || []).map(exp => ({
    id: exp.id,
    expense_type: 'Custom Expense',
    bill_no: 'EXP-' + exp.id.substring(0, 6).toUpperCase(),
    date: exp.expense_date,
    vendor_name: exp.vendor_name || 'N/A',
    description: exp.description || '',
    total_amount: Number(exp.amount) || 0,
    gst_amount: Number(exp.gst_amount) || 0,
    gst_rate: Number(exp.gst_rate) || 0,
    payment_date: exp.payment_date || exp.expense_date,
    payment_method: exp.payment_method || 'N/A',
    payment_status: exp.payment_status || 'Paid',
    category: exp.category || 'Other',
    notes: exp.notes || '',
    subtotal: (Number(exp.amount) || 0) - (Number(exp.gst_amount) || 0),
    originalData: exp
  }));

  // Combine, validate dates, and sort
  const combined = [...pbData, ...ceData].filter(exp => {
    if (!isValidDate(exp.date)) {
      console.warn('Invalid expense date found and filtered out:', exp);
      return false;
    }
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return combined;
};

export const filterExpenses = (expenses, filters) => {
  return expenses.filter(exp => {
    const matchesSearch = !filters.searchQuery || 
      (exp.bill_no && exp.bill_no.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
      (exp.vendor_name && exp.vendor_name.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
      (exp.description && exp.description.toLowerCase().includes(filters.searchQuery.toLowerCase()));
      
    const matchesCategory = !filters.category || filters.category === 'all' || exp.category === filters.category;
    const matchesPayment = !filters.paymentMethod || filters.paymentMethod === 'all' || exp.payment_method === filters.paymentMethod;
    const matchesType = !filters.expenseType || filters.expenseType === 'all' || exp.expense_type === filters.expenseType;

    return matchesSearch && matchesCategory && matchesPayment && matchesType;
  });
};

export const exportExpensesCSV = (expenses, dateRange) => {
  if (!expenses || expenses.length === 0) return;

  const data = expenses.map(exp => ({
    'Type': exp.expense_type,
    'ID/Bill No': exp.bill_no,
    'Date': isValidDate(exp.date) ? format(new Date(exp.date), 'yyyy-MM-dd') : 'Invalid Date',
    'Vendor': exp.vendor_name,
    'Category': exp.category,
    'Description': exp.description,
    'Amount': exp.total_amount,
    'GST Amount': exp.gst_amount,
    'Status': exp.payment_status,
    'Payment Date': exp.payment_date && isValidDate(exp.payment_date) ? format(new Date(exp.payment_date), 'yyyy-MM-dd') : '',
    'Payment Method': exp.payment_method
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
  
  const fileName = `Expenses_Report_${dateRange.start}_to_${dateRange.end}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportExpensesPDF = (expenses, dateRange, stats) => {
  if (!expenses || expenses.length === 0) return;

  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Expenses Report', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 30);
  
  // Summary Stats
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Total Amount: Rs ${stats.totalAmount.toFixed(2)}`, 14, 40);
  doc.text(`Total GST: Rs ${stats.totalGst.toFixed(2)}`, 80, 40);
  doc.text(`Total Records: ${stats.count}`, 150, 40);

  const tableColumn = ["Type", "Date", "Vendor/Desc", "Category", "Amount", "GST", "Status"];
  const tableRows = expenses.map(exp => [
    exp.expense_type === 'Purchase Bill' ? 'PB' : 'CE',
    isValidDate(exp.date) ? format(new Date(exp.date), 'dd/MM/yy') : 'Invalid Date',
    (exp.vendor_name !== 'N/A' ? exp.vendor_name : exp.description).substring(0, 20),
    exp.category,
    `Rs ${exp.total_amount.toFixed(2)}`,
    `Rs ${exp.gst_amount.toFixed(2)}`,
    exp.payment_status
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] }
  });

  doc.save(`Expenses_Report_${dateRange.start}_to_${dateRange.end}.pdf`);
};