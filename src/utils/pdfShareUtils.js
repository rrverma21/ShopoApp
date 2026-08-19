export const detectDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  const isMobileWidth = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  
  const device = (isMobileUA || isMobileWidth) ? 'mobile' : 'desktop';
  console.log('[pdfShareUtils] Detected device type:', device);
  return device;
};

export const canShareFiles = () => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    console.log('[pdfShareUtils] Share API or canShare not supported');
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const canShare = navigator.canShare({ files: [testFile] });
    console.log('[pdfShareUtils] Can share files:', canShare);
    return canShare;
  } catch (error) {
    console.error('[pdfShareUtils] Error checking canShare:', error);
    return false;
  }
};

export const createPDFFile = (blob, invoiceNumber) => {
  try {
    const filename = `Invoice_${invoiceNumber}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });
    console.log('[pdfShareUtils] Created PDF file:', filename, 'Size:', file.size);
    return file;
  } catch (error) {
    console.error('[pdfShareUtils] Error creating PDF file:', error);
    throw new Error('Failed to create PDF file');
  }
};

export const createBlobURL = (blob) => {
  try {
    const url = URL.createObjectURL(blob);
    console.log('[pdfShareUtils] Created Blob URL');
    return url;
  } catch (error) {
    console.error('[pdfShareUtils] Error creating Blob URL:', error);
    throw new Error('Failed to create download link');
  }
};

export const revokeBlobURL = (url) => {
  if (url) {
    URL.revokeObjectURL(url);
    console.log('[pdfShareUtils] Revoked Blob URL');
  }
};

export const downloadFile = (blob, filename) => {
  let url = null;
  try {
    url = createBlobURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('[pdfShareUtils] Triggered file download:', filename);
  } catch (error) {
    console.error('[pdfShareUtils] Error downloading file:', error);
    throw new Error('Failed to download file');
  } finally {
    if (url) {
      setTimeout(() => revokeBlobURL(url), 100);
    }
  }
};

export const generateWhatsAppWebLink = (phoneNumber, message) => {
  const link = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  console.log('[pdfShareUtils] Generated WhatsApp Web link');
  return link;
};

export const generateWhatsAppMessage = (invoiceNumber, totalAmount, invoiceDate, hasPdf = false) => {
  const greeting = `Hello! 👋`;
  const invoiceDetails = `Invoice #${invoiceNumber}`;
  const amountLine = `Amount: ₹${totalAmount.toFixed(2)}`;
  const dateLine = `Date: ${invoiceDate}`;
  const thankYou = `Thank you for your business!`;
  
  let pdfLine = '';
  if (hasPdf) {
    pdfLine = `Your invoice PDF is attached.`;
  } else {
    pdfLine = `Please download the PDF using the link or button provided.`;
  }
  
  const contactLine = `For any queries, feel free to contact us.`;
  
  const message = `${greeting}\n\n${invoiceDetails}\n${amountLine}\n${dateLine}\n\n${thankYou} ${pdfLine}\n\n${contactLine}`;
  
  console.log('[pdfShareUtils] Generated WhatsApp message');
  return message;
};