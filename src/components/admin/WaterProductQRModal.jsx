import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, X, Copy, Check, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const WaterProductQRModal = ({ product, isOpen, onClose }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  // Use the current origin for the link
  const productUrl = `${window.location.origin}/water-order?productId=${product.id}`;

  const handleDownload = () => {
    const canvas = document.getElementById('product-qr-code');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${product.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "QR Code Downloaded",
        description: "The QR code has been saved to your device.",
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Direct order link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg w-[90vw] p-0 gap-0 overflow-hidden bg-white border-0 rounded-xl shadow-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <QrCode className="w-6 h-6 text-white/90" />
              Product QR Code
            </DialogTitle>
          </DialogHeader>
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-blue-100 text-sm mt-2 opacity-90 max-w-[95%]">
            Scan this code to order <strong>{product.name}</strong> directly.
          </p>
        </div>

        <div className="p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 w-full overflow-y-auto">
          {/* QR Code Container */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center">
              <QRCodeCanvas
                id="product-qr-code"
                value={productUrl}
                size={240}
                level={"H"}
                includeMargin={true}
                className="rounded-lg w-full h-auto max-w-[240px] max-h-[240px]"
              />
            </div>
          </div>

          {/* Product Details Tag */}
          <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-center w-full max-w-sm">
            <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">₹{product.price}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm">
            <Button 
              variant="outline" 
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-blue-600 border-slate-200 transition-all duration-200 h-11 order-2 sm:order-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            
            <Button 
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-11 order-1 sm:order-2"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaterProductQRModal;