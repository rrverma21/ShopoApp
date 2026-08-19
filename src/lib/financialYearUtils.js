export const getFinancialYearDates = (type = 'thisYear') => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0 = January, 11 = December
  let startYear = today.getFullYear();

  // If the current month is before April (January - March),
  // the financial year started in the previous calendar year.
  if (currentMonth < 3) {
    startYear -= 1;
  }

  // If we want the previous financial year, subtract one more year.
  if (type === 'lastYear') {
    startYear -= 1;
  }

  // Financial Year runs from April 1st to March 31st of the following year
  const startDate = new Date(startYear, 3, 1); // April 1st
  const endDate = new Date(startYear + 1, 2, 31); // March 31st

  // Helper to format Date objects as local YYYY-MM-DD
  const formatISO = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    startDate: formatISO(startDate),
    endDate: formatISO(endDate),
  };
};