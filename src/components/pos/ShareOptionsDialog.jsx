import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Smartphone, Download, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  detectDeviceType, 
  canShareFiles, 
  createPDFFile, 
  downloadFile, 
  generateWhatsAppWebLink 
} from '@/utils/pdfShareUtils';

const ShareOptionsDialog = ({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  message, 
  pdfBlob, 
  pdfFilename, 
  isGenerating 
}) => {
  const { toast } = useToast();
  const [deviceType, setDeviceType] = useState('desktop');
  const [canShare, setCanShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const detectedDevice = detectDeviceType();
      const shareSupported = canShareFiles();
      setDeviceType(detectedDevice);
      setCanShare(shareSupported);
      console.log('[ShareOptionsDialog] Device state:', { deviceType: detectedDevice, canShare: shareSupported });
    }
  }, [isOpen]);

  const handleMobileShare = async () => {
    if (!pdfBlob || !pdfFilename) {
      toast({
        title: 'Error',
        description: 'PDF file is not ready. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    setIsSharing(true);
    try {
      const file = createPDFFile(pdfBlob, pdfFilename.replace('Invoice_', '').replace('.pdf', ''));
      
      await navigator.share({
        title: 'Invoice',
        text: message,
        files: [file]
      });
      
      console.log('[ShareOptionsDialog] Successfully shared via Share API');
      toast({
        title: 'Success',
        description: 'Invoice shared successfully!'
      });
      onClose();
    } catch (error) {
      console.error('[ShareOptionsDialog] Share API error:', error);
      if (error.name !== 'AbortError') {
        toast({
          title: 'Share Failed',
          description: 'Failed to share the PDF. Try downloading it instead.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleWhatsAppWeb = () => {
    try {
      console.log('[ShareDialog] Opening WhatsApp Web');
      const whatsappUrl = generateWhatsAppWebLink(phoneNumber, message);
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: 'Opening WhatsApp Web',
        description: 'Redirecting to WhatsApp...'
      });
      
      onClose();
    } catch (error) {
      console.error('[ShareDialog] WhatsApp Web error:', error);
      toast({
        title: 'Share Failed',
        description: 'Could not open WhatsApp Web',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlob || !pdfFilename) {
      toast({
        title: 'Error',
        description: 'PDF file is not ready. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      downloadFile(pdfBlob, pdfFilename);
      toast({
        title: 'Success',
        description: 'PDF downloaded successfully'
      });
    } catch (error) {
      console.error('[ShareDialog] Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the PDF.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[9999] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Share Invoice
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {deviceType === 'mobile' && canShare 
              ? 'Share this invoice with PDF attached directly via WhatsApp.' 
              : 'Share invoice text via WhatsApp and download the PDF.'}
          </DialogDescription>
        </DialogHeader>

        {isGenerating || isSharing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-sm text-gray-500">
              {isGenerating ? 'Generating invoice PDF...' : 'Preparing to share...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            {deviceType === 'mobile' && canShare ? (
              <Button
                onClick={handleMobileShare}
                className="w-full justify-start gap-3 h-auto py-4 px-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                variant="outline"
              >
                <Smartphone className="w-5 h-5 text-green-600" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Share via WhatsApp (with PDF)</div>
                  <div className="text-xs text-gray-500">Uses native share menu</div>
                </div>
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleWhatsAppWeb}
                  className="w-full justify-start gap-3 h-auto py-4 px-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                  variant="outline"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-900">Share via WhatsApp Web</div>
                    <div className="text-xs text-gray-500">Opens in browser (Text only)</div>
                  </div>
                </Button>
                
                <Button
                  onClick={handleDownloadPDF}
                  className="w-full justify-start gap-3 h-auto py-4 px-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                  variant="outline"
                >
                  <Download className="w-5 h-5 text-blue-600" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-900">Download PDF</div>
                    <div className="text-xs text-gray-500">Save file to your device</div>
                  </div>
                </Button>
              </>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            disabled={isGenerating || isSharing}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareOptionsDialog;