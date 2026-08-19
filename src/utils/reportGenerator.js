import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getCategoryTotals, getGSTTypeTotals, getMonthlyTotals, calculateTotal } from './gstCalculations';

export const generateExpenseLedgerReport = (expenses) => {
  const sorted = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
  let totalAmount = 0;
  let totalGST = 0;
  
  const rows = sorted.map(exp => {
    totalAmount += parseFloat(exp.amount || 0);
    totalGST += parseFloat(exp.gst_amount || 0);
    return [
      exp.date,
      exp.vendor,
      exp.category,
      exp.invoice_number || '-',
      exp.gst_type || '-',
      parseFloat(exp.amount || 0).toFixed(2),
      parseFloat(exp.gst_amount || 0).toFixed(2),
      calculateTotal(exp.amount, exp.gst_amount).toFixed(2)
    ];
  });

  return {
    headers: ['Date', 'Vendor', 'Category', 'Invoice', 'GST Type', 'Amount', 'GST Amount', 'Total'],
    rows,
    summary: { totalAmount, totalGST, grandTotal: totalAmount + totalGST }
  };
};

export const generateCategorySummaryReport = (expenses) => {
  const totals = getCategoryTotals(expenses);
  const rows = Object.keys(totals).map(cat => [
    cat,
    totals[cat].count,
    totals[cat].expenses.toFixed(2),
    totals[cat].gst.toFixed(2),
    totals[cat].total.toFixed(2)
  ]);
  return { headers: ['Category', 'Txn Count', 'Total Expenses', 'Total GST', 'Grand Total'], rows };
};

export const generateGSTSummaryReport = (expenses) => {
  const totals = getGSTTypeTotals(expenses);
  const rows = Object.keys(totals).filter(k => k !== 'None').map(type => [
    type,
    totals[type].toFixed(2)
  ]);
  const totalGst = Object.values(totals).reduce((a, b) => a + b, 0);
  return { headers: ['GST Type', 'Amount'], rows, totalGst };
};

export const generateMonthWiseReport = (expenses) => {
  const totals = getMonthlyTotals(expenses);
  const rows = Object.keys(totals).map(month => [
    month,
    totals[month].expenses.toFixed(2),
    totals[month].gst.toFixed(2),
    totals[month].total.toFixed(2)
  ]);
  return { headers: ['Month', 'Expenses', 'GST', 'Total'], rows };
};

export const exportToCSV = (reportData, filename) => {
  const csvContent = [
    reportData.headers.join(','),
    ...reportData.rows.map(row => row.map(v => `"${v}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (reportData, reportType, filename) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(reportType, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  doc.autoTable({
    startY: 40,
    head: [reportData.headers],
    body: reportData.rows,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`${filename}.pdf`);
};