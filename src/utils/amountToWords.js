// Amount to Words Converter for Indian Rupees
// Converts numeric amounts to words format (e.g., 1234 -> "One Thousand Two Hundred Thirty Four Rupees Only")

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertTwoDigit(num) {
  if (num < 10) return ones[num];
  if (num >= 10 && num < 20) return teens[num - 10];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
}

function convertThreeDigit(num) {
  if (num === 0) return '';
  if (num < 100) return convertTwoDigit(num);
  return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertTwoDigit(num % 100) : '');
}

export function amountToWords(amount) {
  if (amount === 0) return 'Zero Rupees Only';
  
  const num = Math.floor(amount);
  let result = '';

  // Crores
  if (num >= 10000000) {
    result += convertThreeDigit(Math.floor(num / 10000000)) + ' Crore ';
  }

  // Lakhs
  if (num >= 100000) {
    const lakhs = Math.floor((num % 10000000) / 100000);
    if (lakhs > 0) {
      result += convertTwoDigit(lakhs) + ' Lakh ';
    }
  }

  // Thousands
  if (num >= 1000) {
    const thousands = Math.floor((num % 100000) / 1000);
    if (thousands > 0) {
      result += convertTwoDigit(thousands) + ' Thousand ';
    }
  }

  // Hundreds
  if (num >= 100) {
    const hundreds = Math.floor((num % 1000) / 100);
    if (hundreds > 0) {
      result += ones[hundreds] + ' Hundred ';
    }
  }

  // Tens and ones
  const remainder = num % 100;
  if (remainder > 0) {
    result += convertTwoDigit(remainder);
  }

  return result.trim() + ' Rupees Only';
}