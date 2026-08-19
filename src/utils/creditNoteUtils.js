/**
 * Utility functions for credit note validation and usage
 */

export const validateCreditNoteUsable = (creditNote, amountToApply) => {
  if (!creditNote) return { valid: false, error: "No credit note selected." };
  
  if (creditNote.status === 'Fully Used' || creditNote.status === 'Cancelled') {
    return { valid: false, error: `Credit note is ${creditNote.status}.` };
  }
  
  const balance = creditNote.remaining_balance !== undefined ? parseFloat(creditNote.remaining_balance) : parseFloat(creditNote.amount);
  const amount = parseFloat(amountToApply);
  
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: "Amount to apply must be greater than zero." };
  }
  
  if (amount > balance) {
    return { valid: false, error: `Amount exceeds remaining balance (${balance.toFixed(2)}).` };
  }
  
  return { valid: true, error: null };
};

export const calculateRemainingBalance = (creditNote) => {
  if (!creditNote) return 0;
  return creditNote.remaining_balance !== undefined ? parseFloat(creditNote.remaining_balance) : parseFloat(creditNote.amount);
};

export const formatUsageHistory = (historyData) => {
  if (!Array.isArray(historyData)) return [];
  return historyData.map(item => ({
    ...item,
    formattedDate: new Date(item.usage_date).toLocaleString(),
    amountUsedFormatted: parseFloat(item.amount_used).toFixed(2),
    balanceFormatted: parseFloat(item.remaining_balance).toFixed(2)
  }));
};