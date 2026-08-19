import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useInvoicePDFShare } from '@/hooks/useInvoicePDFShare';

/**
 * WhatsApp Share Button Component
 * Device-aware button that shares invoices via WhatsApp with PDF attachment (mobile)
 * or WhatsApp Web with text message (desktop)
 * 
 * @param {Object} props
 * @param {HTMLElement} props.invoiceElement - DOM element containing invoice to capture
 * @param {string} props.invoiceNumber - Invoice number for filename and message
 * @param {number} props.totalAmount - Total invoice amount
 * @param {string} props.invoiceDate - Invoice date string
 * @param {string} props.customerName - Customer name (optional)
 * @param {string} props.customerPhone - Customer phone number for WhatsApp Web
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable button
 * @param {string} props.size - Button size (default, sm, lg, icon)
 * @param {string} props.variant - Button variant
 */
const WhatsAppShareButton = ({
  invoiceElement,
  invoiceNumber,
  totalAmount,
  invoiceDate,
  customerName,
  customerPhone,
  className = '',
  disabled = false,
  size = 'default',
  variant = 'default'
}) => {
  const {
    isGenerating,
    deviceType,
    canShare,
    initializeShareCapabilities,
    shareViaWhatsApp,
    shareViaWhatsAppWeb,
    downloadInvoicePDF
  } = useInvoicePDFShare();

  // Initialize device capabilities on mount
  useEffect(() => {
    initializeShareCapabilities();
  }, [initializeShareCapabilities]);

  const handleClick = async () => {
    console.log('[WhatsAppShareButton] Button clicked', {
      deviceType,
      canShare,
      invoiceNumber,
      totalAmount,
      invoiceDate,
      customerName,
      customerPhone,
      hasInvoiceElement: !!invoiceElement
    });

    // Validate required data
    if (!invoiceElement) {
      console.error('[WhatsAppShareButton] Missing invoice element');
      return;
    }

    if (!invoiceNumber || !totalAmount || !invoiceDate) {
      console.error('[WhatsAppShareButton] Missing required invoice data', {
        invoiceNumber,
        totalAmount,
        invoiceDate
      });
      return;
    }

    // Mobile with Share API - share with PDF attachment
    if (deviceType === 'mobile' && canShare) {
      console.log('[WhatsAppShareButton] Using mobile Share API');
      const success = await shareViaWhatsApp({
        invoiceElement,
        invoiceNumber,
        totalAmount,
        invoiceDate,
        customerName
      });

      // If Share API fails or is cancelled, fallback to download
      if (!success) {
        console.log('[WhatsAppShareButton] Share API failed, offering download');
        await downloadInvoicePDF({ invoiceElement, invoiceNumber });
      }
    } 
    // Desktop or no Share API - open WhatsApp Web + offer download
    else {
      console.log('[WhatsAppShareButton] Using WhatsApp Web fallback');
      
      // Open WhatsApp Web with message
      if (customerPhone) {
        shareViaWhatsAppWeb({
          phoneNumber: customerPhone,
          invoiceNumber,
          totalAmount,
          invoiceDate
        });
      }
      
      // Also trigger PDF download for desktop users
      await downloadInvoicePDF({ invoiceElement, invoiceNumber });
    }
  };

  // Determine button text based on device and share capability
  const getButtonText = () => {
    if (isGenerating) {
      return 'Preparing invoice...';
    }
    if (deviceType === 'mobile' && canShare) {
      return 'Share via WhatsApp (with PDF)';
    }
    return 'Share via WhatsApp Web';
  };

  // Determine icon and styling
  const showLoadingIcon = isGenerating;
  const isDisabled = disabled || isGenerating;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      size={size}
      variant={variant}
      className={`font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors ${className}`}
    >
      {showLoadingIcon ? (
        <Loader2 className="w-4 h-4 mr-2 text-white animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4 mr-2 text-white" />
      )}
      {getButtonText()}
    </Button>
  );
};

export default WhatsAppShareButton;