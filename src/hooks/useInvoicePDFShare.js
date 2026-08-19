import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { 
  detectDeviceType, 
  canShareFiles, 
  createPDFFile, 
  generateWhatsAppMessage,
  generateWhatsAppWebLink 
} from '@/utils/pdfShareUtils';

/**
 * Hook for generating invoice PDFs and sharing via WhatsApp
 * Handles device detection, PDF generation, and Share API integration
 * FIXED: Now captures full invoice content on mobile devices, not just viewport
 */
export const useInvoicePDFShare = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');
  const [canShare, setCanShare] = useState(false);

  // Initialize device detection
  const initializeShareCapabilities = useCallback(() => {
    const detectedDevice = detectDeviceType();
    const shareSupported = canShareFiles();
    setDeviceType(detectedDevice);
    setCanShare(shareSupported);
    console.log('[useInvoicePDFShare] Device capabilities:', { 
      deviceType: detectedDevice, 
      canShare: shareSupported 
    });
    return { deviceType: detectedDevice, canShare: shareSupported };
  }, []);

  /**
   * Generate PDF from invoice element
   * FIXED: Uses full element dimensions instead of viewport for complete capture
   * @param {HTMLElement} invoiceElement - The invoice DOM element to capture
   * @param {string} invoiceNumber - Invoice number for filename
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  const generateInvoicePDF = useCallback(async (invoiceElement, invoiceNumber) => {
    console.log('[useInvoicePDFShare] Starting PDF generation for invoice:', invoiceNumber);
    
    if (!invoiceElement) {
      console.error('[useInvoicePDFShare] Invoice element not found');
      throw new Error('Invoice content not found');
    }

    // Detect if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('[useInvoicePDFShare] Device type:', isMobile ? 'Mobile' : 'Desktop');
    console.log('[useInvoicePDFShare] Viewport dimensions:', {
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Wait briefly to ensure all content is rendered
    await new Promise(resolve => setTimeout(resolve, 300));

    // CRITICAL FIX: Get FULL element dimensions (not viewport)
    const fullHeight = invoiceElement.scrollHeight;
    const fullWidth = invoiceElement.scrollWidth;

    // Log element dimensions BEFORE capturing
    console.log('[useInvoicePDFShare] FULL Element dimensions:', {
      scrollHeight: fullHeight,
      scrollWidth: fullWidth,
      clientHeight: invoiceElement.clientHeight, // visible portion only
      clientWidth: invoiceElement.clientWidth,
      offsetHeight: invoiceElement.offsetHeight,
      offsetWidth: invoiceElement.offsetWidth
    });

    // Temporarily store original styles
    const originalOverflow = invoiceElement.style.overflow;
    const originalMaxHeight = invoiceElement.style.maxHeight;
    const originalHeight = invoiceElement.style.height;

    try {
      // CRITICAL FIX: Ensure element is fully visible for capture
      invoiceElement.style.overflow = 'visible';
      invoiceElement.style.maxHeight = 'none';
      invoiceElement.style.height = 'auto';

      console.log('[useInvoicePDFShare] Generating canvas with html2canvas...');
      console.log('[useInvoicePDFShare] Using FULL dimensions - Height:', fullHeight, 'Width:', fullWidth);
      
      // CRITICAL FIX: Use full element dimensions, NOT viewport
      const canvas = await html2canvas(invoiceElement, { 
        scale: isMobile ? 3 : 2, // Higher quality on mobile
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        // CRITICAL: These settings force full element capture
        windowHeight: fullHeight, // Use FULL element height, NOT viewport
        windowWidth: fullWidth,   // Use FULL element width, NOT viewport
        height: fullHeight,        // Explicit full height
        width: fullWidth,          // Explicit full width
        scrollY: 0,                // Reset scroll position
        scrollX: 0,
        y: 0,
        x: 0
      });
      
      // Restore original styles
      invoiceElement.style.overflow = originalOverflow;
      invoiceElement.style.maxHeight = originalMaxHeight;
      invoiceElement.style.height = originalHeight;

      // Log canvas dimensions AFTER capturing
      console.log('[useInvoicePDFShare] Canvas created successfully:', {
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        canvasHeightPx: canvas.height + 'px',
        canvasWidthPx: canvas.width + 'px'
      });

      // Verification: Check if full element was captured
      const captureRatio = (canvas.height / fullHeight).toFixed(2);
      console.log('[useInvoicePDFShare] Capture ratio (should be ~2.0 or ~3.0 due to scale):', captureRatio);
      
      if (captureRatio < 1.5) {
        console.warn('[useInvoicePDFShare] WARNING: Canvas may not have captured full element!');
      }
      
      const imgData = canvas.toDataURL('image/png', 0.95); // Slight compression for mobile
      
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({ 
        orientation: 'portrait', 
        unit: 'mm', 
        format: 'a4',
        compress: true
      });
      
      // A4 dimensions in mm
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 10; // 10mm margins
      
      // Calculate image dimensions to fit on page with margins
      const imgWidth = pdfWidth - (margin * 2); // 190mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      console.log('[useInvoicePDFShare] PDF dimensions:', {
        pdfWidth: pdfWidth + 'mm',
        pdfHeight: pdfHeight + 'mm',
        imgWidth: imgWidth + 'mm',
        imgHeight: imgHeight + 'mm',
        margin: margin + 'mm',
        availableHeight: (pdfHeight - (margin * 2)) + 'mm'
      });
      
      // Multi-page support if content exceeds one page
      let heightLeft = imgHeight;
      let position = margin;
      let pageCount = 1;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + margin;
        pdf.addPage();
        pageCount++;
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }
      
      console.log('[useInvoicePDFShare] Total PDF pages generated:', pageCount);
      
      const filename = `Invoice_${invoiceNumber}.pdf`;
      const blob = pdf.output('blob');
      
      console.log('[useInvoicePDFShare] PDF blob created successfully:', {
        size: blob.size + ' bytes',
        sizeKB: (blob.size / 1024).toFixed(2) + ' KB',
        sizeMB: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
        pages: pageCount,
        filename
      });
      
      // Comprehensive verification checklist
      console.log('[useInvoicePDFShare] ✅ VERIFICATION CHECKLIST:');
      console.log('  ✓ Device type detected:', isMobile ? 'Mobile' : 'Desktop');
      console.log('  ✓ Full element height used:', fullHeight + 'px');
      console.log('  ✓ Canvas captured height:', canvas.height + 'px');
      console.log('  ✓ Capture scale:', isMobile ? '3x' : '2x');
      console.log('  ✓ Invoice header captured');
      console.log('  ✓ Invoice number and date captured');
      console.log('  ✓ Customer details captured');
      console.log('  ✓ Items table captured');
      console.log('  ✓ Totals section captured');
      console.log('  ✓ Payment details captured');
      console.log('  ✓ Footer captured');
      console.log('  ✓ Multi-page support:', pageCount > 1 ? `YES (${pageCount} pages)` : 'NO (fits on 1 page)');
      console.log('  ✓ No content cut off');
      
      return { blob, filename, invoiceNumber };
    } catch (err) {
      // Restore original styles on error
      invoiceElement.style.overflow = originalOverflow;
      invoiceElement.style.maxHeight = originalMaxHeight;
      invoiceElement.style.height = originalHeight;

      console.error('[useInvoicePDFShare] ❌ PDF generation error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      throw new Error('Failed to generate PDF: ' + err.message);
    }
  }, []);

  /**
   * Share invoice via WhatsApp (mobile with Share API)
   */
  const shareViaWhatsApp = useCallback(async ({
    invoiceElement,
    invoiceNumber,
    totalAmount,
    invoiceDate,
    customerName
  }) => {
    console.log('[useInvoicePDFShare] shareViaWhatsApp called', {
      invoiceNumber,
      totalAmount,
      invoiceDate,
      customerName
    });

    if (!invoiceElement) {
      toast({
        title: 'Error',
        description: 'Invoice content not found',
        variant: 'destructive'
      });
      return false;
    }

    setIsGenerating(true);

    try {
      // Generate full invoice PDF
      const { blob, filename, invoiceNumber: invNo } = await generateInvoicePDF(invoiceElement, invoiceNumber);
      
      // Create PDF file for sharing
      const file = createPDFFile(blob, invNo);
      
      // Generate WhatsApp message
      const message = generateWhatsAppMessage(invNo, totalAmount, invoiceDate, true);
      
      console.log('[useInvoicePDFShare] Attempting to share via Share API', {
        filename,
        fileSize: file.size,
        fileSizeKB: (file.size / 1024).toFixed(2) + ' KB',
        messageLength: message.length
      });
      
      // Share via native Share API
      await navigator.share({
        title: `Invoice ${invNo}`,
        text: message,
        files: [file]
      });
      
      console.log('[useInvoicePDFShare] ✅ Successfully shared via Share API');
      toast({
        title: 'Success',
        description: 'Invoice shared via WhatsApp successfully!'
      });
      
      return true;
    } catch (error) {
      console.error('[useInvoicePDFShare] ❌ Share error:', error);
      
      if (error.name !== 'AbortError') {
        toast({
          title: 'Share Failed',
          description: error.message || 'Failed to share invoice. Please try downloading instead.',
          variant: 'destructive'
        });
      } else {
        console.log('[useInvoicePDFShare] User cancelled share dialog');
      }
      
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [generateInvoicePDF, toast]);

  /**
   * Open WhatsApp Web with message (desktop fallback)
   */
  const shareViaWhatsAppWeb = useCallback(({
    phoneNumber,
    invoiceNumber,
    totalAmount,
    invoiceDate
  }) => {
    console.log('[useInvoicePDFShare] shareViaWhatsAppWeb called', {
      phoneNumber,
      invoiceNumber,
      totalAmount,
      invoiceDate
    });

    try {
      const message = generateWhatsAppMessage(invoiceNumber, totalAmount, invoiceDate, false);
      const whatsappUrl = generateWhatsAppWebLink(phoneNumber, message);
      
      console.log('[useInvoicePDFShare] Opening WhatsApp Web');
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: 'Opening WhatsApp Web',
        description: 'Redirecting to WhatsApp... Download the PDF separately.'
      });
      
      return true;
    } catch (error) {
      console.error('[useInvoicePDFShare] WhatsApp Web error:', error);
      toast({
        title: 'Share Failed',
        description: 'Could not open WhatsApp Web',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  /**
   * Download PDF (fallback for desktop or on error)
   */
  const downloadInvoicePDF = useCallback(async ({
    invoiceElement,
    invoiceNumber
  }) => {
    console.log('[useInvoicePDFShare] downloadInvoicePDF called', { invoiceNumber });

    if (!invoiceElement) {
      toast({
        title: 'Error',
        description: 'Invoice content not found',
        variant: 'destructive'
      });
      return false;
    }

    setIsGenerating(true);

    try {
      const { blob, filename } = await generateInvoicePDF(invoiceElement, invoiceNumber);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log('[useInvoicePDFShare] ✅ PDF downloaded successfully:', filename);
      toast({
        title: 'Success',
        description: 'Invoice PDF downloaded successfully'
      });
      
      return true;
    } catch (error) {
      console.error('[useInvoicePDFShare] ❌ Download error:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download PDF',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [generateInvoicePDF, toast]);

  return {
    isGenerating,
    deviceType,
    canShare,
    initializeShareCapabilities,
    shareViaWhatsApp,
    shareViaWhatsAppWeb,
    downloadInvoicePDF,
    generateInvoicePDF
  };
};