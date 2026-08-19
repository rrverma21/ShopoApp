import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Generates the standardized data string for the QR code
 * @param {string} employeeId - The UUID of the employee
 * @returns {string} - The formatted string to be encoded
 */
export const generateQRCodeDataStatic = (employeeId) => {
  if (!employeeId) return '';
  // Task: Encode ONLY the employee UUID without any prefixes
  console.log('[QR Gen] Generating QR for ID:', employeeId);
  return employeeId; 
};

/**
 * Downloads a specific HTML element as a PNG image
 * @param {string} elementId - The DOM ID of the element to capture
 * @param {string} fileName - The desired output filename
 */
export const downloadQRCodePNG = async (elementId, fileName) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Element with id '${elementId}' not found`);

    console.log(`[QR Gen] Starting PNG generation for ${elementId}...`);

    // Small delay to ensure rendering frames are complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 4, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff', // Force white background
      allowTaint: true,
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    
    if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Generated canvas is empty. Please check element visibility.');
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('[QR Gen] PNG download initiated.');
    return true;
  } catch (error) {
    console.error("[QR Gen] Error downloading PNG:", error);
    throw error;
  }
};

/**
 * Downloads a specific HTML element as a PDF document
 * @param {string} elementId - The DOM ID of the element to capture
 * @param {string} fileName - The desired output filename
 */
export const downloadQRCodePDF = async (elementId, fileName) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Element with id '${elementId}' not found`);

    console.log(`[QR Gen] Starting PDF generation for ${elementId}...`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 4,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    
    if (!imgData || imgData === 'data:,') {
        throw new Error('Generated canvas is empty.');
    }

    // A4 dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    
    // Calculate dimensions to fit width (with some padding) while maintaining aspect ratio
    const margin = 40; // mm
    const availableWidth = pdfWidth - (margin * 2);
    const finalImgHeight = (imgProps.height * availableWidth) / imgProps.width;
    
    // Center vertically
    const y = (pdfHeight - finalImgHeight) / 2;

    pdf.addImage(imgData, 'PNG', margin, y, availableWidth, finalImgHeight);
    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    
    console.log('[QR Gen] PDF download initiated.');
    return true;
  } catch (error) {
    console.error("[QR Gen] Error downloading PDF:", error);
    throw error;
  }
};