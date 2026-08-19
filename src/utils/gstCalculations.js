export const calculateGSTAmount = (amount, rate) => {
  if (!amount || !rate) return 0;
  return parseFloat(((amount * rate) / 100).toFixed(2));
};

export const calculateTotal = (amount, gstAmount) => {
  if (!amount) return 0;
  return parseFloat((parseFloat(amount) + parseFloat(gstAmount || 0)).toFixed(2));
};

export const getMonthlyTotals = (expenses) => {
  return expenses.reduce((acc, exp) => {
    const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { expenses: 0, gst: 0, total: 0 };
    }
    acc[month].expenses += parseFloat(exp.amount || 0);
    acc[month].gst += parseFloat(exp.gst_amount || 0);
    acc[month].total += calculateTotal(exp.amount, exp.gst_amount);
    return acc;
  }, {});
};

export const getCategoryTotals = (expenses) => {
  return expenses.reduce((acc, exp) => {
    const cat = exp.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = { count: 0, expenses: 0, gst: 0, total: 0 };
    }
    acc[cat].count += 1;
    acc[cat].expenses += parseFloat(exp.amount || 0);
    acc[cat].gst += parseFloat(exp.gst_amount || 0);
    acc[cat].total += calculateTotal(exp.amount, exp.gst_amount);
    return acc;
  }, {});
};

export const getGSTTypeTotals = (expenses) => {
  return expenses.reduce((acc, exp) => {
    const type = exp.gst_type || 'None';
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += parseFloat(exp.gst_amount || 0);
    return acc;
  }, { IGST: 0, CGST: 0, SGST: 0, None: 0 });
};