import { format } from 'date-fns';

/**
 * Export business expenses to CSV format
 * @param {Array} expenses - Array of expense objects
 * @returns {void} - Triggers download
 */
export const exportExpensesToCSV = (expenses) => {
  if (!expenses || expenses.length === 0) {
    throw new Error('No expenses to export');
  }

  // Define CSV headers
  const headers = [
    'Expense Type',
    'Description',
    'Date',
    'Amount (₹)',
    'GST Amount (₹)',
    'Total (₹)',
    'Payment Method',
    'Reference/Bill No',
    'Notes'
  ];

  // Convert expenses to CSV rows
  const rows = expenses.map(expense => {
    const total = (parseFloat(expense.amount) || 0) + (parseFloat(expense.gst_amount) || 0);
    
    return [
      expense.expense_type || '',
      expense.description || '',
      expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : '',
      (expense.amount || 0).toFixed(2),
      (expense.gst_amount || 0).toFixed(2),
      total.toFixed(2),
      expense.payment_method || '',
      expense.reference_no || '',
      expense.notes || ''
    ];
  });

  // Calculate summary totals
  const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const totalGST = expenses.reduce((sum, exp) => sum + (parseFloat(exp.gst_amount) || 0), 0);
  const grandTotal = totalAmount + totalGST;

  // Add summary rows
  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '', '', '', '', '']);
  rows.push(['Total Amount', '', '', totalAmount.toFixed(2), '', '', '', '', '']);
  rows.push(['Total GST', '', '', '', totalGST.toFixed(2), '', '', '', '']);
  rows.push(['Grand Total', '', '', '', '', grandTotal.toFixed(2), '', '', '']);

  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape commas and quotes in cell content
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `business_expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Format expense data for display
 * @param {Object} expense - Expense object
 * @returns {Object} - Formatted expense
 */
export const formatExpenseForDisplay = (expense) => {
  if (!expense) return null;
  
  const total = (parseFloat(expense.amount) || 0) + (parseFloat(expense.gst_amount) || 0);
  
  return {
    ...expense,
    formattedDate: expense.date ? format(new Date(expense.date), 'dd MMM yyyy') : 'N/A',
    formattedAmount: `₹${(expense.amount || 0).toFixed(2)}`,
    formattedGST: `₹${(expense.gst_amount || 0).toFixed(2)}`,
    formattedTotal: `₹${total.toFixed(2)}`,
    total: total
  };
};