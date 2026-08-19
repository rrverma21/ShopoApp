export const convertToIndianWords = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  const num = parseFloat(amount);
  if (num === 0) return 'Zero Rupees';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n) => {
    if (n < 20) return units[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? ' ' + units[digit] : '');
  };

  const convertHundreds = (n) => {
    if (n < 100) return convertGroup(n);
    const remainder = n % 100;
    return units[Math.floor(n / 100)] + ' Hundred' + (remainder ? ' ' + convertGroup(remainder) : '');
  };

  const convertWholeNumber = (n) => {
    if (n === 0) return '';
    let words = [];
    const crores = Math.floor(n / 10000000);
    if (crores > 0) words.push(convertWholeNumber(crores) + ' Crore');
    n %= 10000000;
    const lakhs = Math.floor(n / 100000);
    if (lakhs > 0) words.push(convertGroup(lakhs) + ' Lakh');
    n %= 100000;
    const thousands = Math.floor(n / 1000);
    if (thousands > 0) words.push(convertGroup(thousands) + ' Thousand');
    n %= 1000;
    if (n > 0) words.push(convertHundreds(n));
    return words.join(' ');
  };

  const parts = num.toFixed(2).split('.');
  const wholePart = parseInt(parts[0]);
  const decimalPart = parseInt(parts[1]);

  let result = convertWholeNumber(wholePart) + ' Rupees';
  if (decimalPart > 0) {
    result += ' and ' + convertGroup(decimalPart) + ' Paise';
  }
  return result + ' Only';
};

export const convertToWesternWords = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  const num = parseFloat(amount);
  if (num === 0) return 'Zero Pounds';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n) => {
    if (n < 20) return units[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? ' ' + units[digit] : '');
  };

  const convertHundreds = (n) => {
    if (n < 100) return convertGroup(n);
    const remainder = n % 100;
    return units[Math.floor(n / 100)] + ' Hundred' + (remainder ? ' and ' + convertGroup(remainder) : '');
  };

  const convertWholeNumber = (n) => {
    if (n === 0) return '';
    let words = [];
    const millions = Math.floor(n / 1000000);
    if (millions > 0) words.push(convertWholeNumber(millions) + ' Million');
    n %= 1000000;
    const thousands = Math.floor(n / 1000);
    if (thousands > 0) words.push(convertHundreds(thousands) + ' Thousand');
    n %= 1000;
    if (n > 0) words.push(convertHundreds(n));
    return words.join(' ');
  };

  const parts = num.toFixed(2).split('.');
  const wholePart = parseInt(parts[0]);
  const decimalPart = parseInt(parts[1]);

  let result = convertWholeNumber(wholePart) + ' Pounds';
  if (decimalPart > 0) {
    result += ' and ' + convertGroup(decimalPart) + ' Pence';
  }
  return result + ' Only';
};

export const convertAmountToWords = (amount, region = 'India') => {
  return region === 'India' ? convertToIndianWords(amount) : convertToWesternWords(amount);
};