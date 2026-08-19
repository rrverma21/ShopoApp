export const REGION_CONSTANTS = {
  India: {
    id: 'IN',
    name: 'India',
    currency: { symbol: '₹', code: 'INR' },
    tax: { name: 'GST', rates: [0, 5, 12, 18, 28] },
    dateFormat: 'dd/MM/yyyy',
    phonePrefix: '+91',
    invoiceLabels: {
      taxInvoice: 'TAX INVOICE',
      taxName: 'GST',
      taxId: 'GSTIN'
    }
  },
  UK: {
    id: 'UK',
    name: 'United Kingdom',
    currency: { symbol: '£', code: 'GBP' },
    tax: { name: 'VAT', rates: [0, 5, 20] },
    dateFormat: 'dd/MM/yyyy',
    phonePrefix: '+44',
    invoiceLabels: {
      taxInvoice: 'VAT INVOICE',
      taxName: 'VAT',
      taxId: 'VAT Reg No'
    }
  }
};

export const getRegionConfig = (regionName) => {
  return REGION_CONSTANTS[regionName] || REGION_CONSTANTS.India;
};