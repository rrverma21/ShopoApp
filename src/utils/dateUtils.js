import { format, isValid } from 'date-fns';

export const parseExpenseDate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return isValid(d) ? d : null;
};

export const isValidDate = (dateValue) => {
  return parseExpenseDate(dateValue) !== null;
};

export const formatExpenseDate = (dateValue, formatStr = 'MMM dd, yyyy') => {
  const d = parseExpenseDate(dateValue);
  if (!d) return 'Invalid Date';
  try {
    return format(d, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

export const getDateRange = (expenses) => {
  if (!expenses || expenses.length === 0) return null;
  const validDates = expenses
    .map(e => parseExpenseDate(e.date || e.expense_date || e.bill_date))
    .filter(d => d !== null)
    .sort((a, b) => a - b);
    
  if (validDates.length === 0) return null;
  
  return {
    start: validDates[0],
    end: validDates[validDates.length - 1]
  };
};