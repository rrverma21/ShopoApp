// DEPRECATED: This component has been superseded by GSTInvoiceButton.jsx for direct download
// and improved invoice generation logic. Keeping minimal structure to prevent import errors if any.

import React from 'react';

const GSTInvoicePrinter = ({ isOpen, onClose }) => {
  // Auto-close if accidentally opened
  // Hook moved to top level to comply with React Rules of Hooks
  React.useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return null;
};

export default GSTInvoicePrinter;