/**
 * Utility for comprehensive barcode validation
 */

export const validateBarcode = (barcode) => {
  if (!barcode) {
    return {
      isValid: false,
      error: "Barcode cannot be empty",
      cleanBarcode: ""
    };
  }

  // Convert to string and trim whitespace
  const cleanBarcode = String(barcode).trim();

  if (cleanBarcode.length === 0) {
    return {
      isValid: false,
      error: "Barcode cannot be only whitespace",
      cleanBarcode: ""
    };
  }

  // Basic format check: Barcodes usually contain alphanumeric characters, hyphens, etc.
  // We allow letters and numbers for general formats (CODE128, etc.), but typically no special symbols like @#!
  const formatRegex = /^[A-Za-z0-9\-]+$/;
  if (!formatRegex.test(cleanBarcode)) {
    return {
      isValid: false,
      error: "Barcode contains invalid characters. Use letters, numbers, and hyphens only.",
      cleanBarcode
    };
  }

  // Minimum length check (usually at least 3-4 chars for any standard, up to 128)
  if (cleanBarcode.length < 3) {
    return {
      isValid: false,
      error: "Barcode is too short to be valid",
      cleanBarcode
    };
  }

  return {
    isValid: true,
    error: null,
    cleanBarcode
  };
};