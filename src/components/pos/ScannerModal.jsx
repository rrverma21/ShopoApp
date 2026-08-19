import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, Camera, AlertCircle } from "lucide-react";
import jsQR from "jsqr";

const ScannerModal = ({ open, onScan, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let stream = null;
    let animationFrameId = null;

    if (!open) return;

    const startScan = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS Safari to play inline and not go fullscreen
          videoRef.current.setAttribute("playsinline", "true"); 
          
          await videoRef.current.play();
          setIsLoading(false);
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setIsLoading(false);
        if (err.name === 'NotAllowedError') {
          setError("Camera permission denied. Please allow camera access to scan barcodes.");
        } else if (err.name === 'NotFoundError') {
          setError("No camera found on this device.");
        } else {
          setError("Unable to access camera. Please check permissions.");
        }
      }
    };

    const tick = () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (canvas) {
          const context = canvas.getContext("2d");
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          
          // Draw video frame to canvas for analysis
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get image data for jsQR
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Attempt to detect QR/Barcode
          // jsQR is optimized for QR codes but often handles standard barcodes if clear enough.
          // For strictly 1D barcodes, libraries like QuaggaJS are specialized, but prompt specified jsQR.
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // Draw a box around the detected code for feedback
            drawRect(code.location, context);
            
            // Trigger scan callback
            onScan(code.data);
            return; // Stop loop on successful scan
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    const drawRect = (location, context) => {
      if (!location) return;
      context.beginPath();
      context.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
      context.lineTo(location.topRightCorner.x, location.topRightCorner.y);
      context.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
      context.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
      context.lineTo(location.topLeftCorner.x, location.topLeftCorner.y);
      context.lineWidth = 4;
      context.strokeStyle = "#00FF00";
      context.stroke();
    };

    startScan();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black text-white border-slate-800" onInteractOutside={(e) => e.preventDefault()}>
         
         <div className="relative h-[400px] w-full flex items-center justify-center bg-black">
            {/* Video Element (Visible for user aiming) */}
            <video 
              ref={videoRef} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              muted 
            />
            
            {/* Canvas Element (Hidden or Overlay) - We hide it as we just use it for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading State */}
            {isLoading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-2" />
                <span className="text-sm text-zinc-400">Starting camera...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-20 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
                <p className="text-white font-medium mb-1">Scanner Error</p>
                <p className="text-zinc-400 text-sm mb-4">{error}</p>
                <Button variant="secondary" onClick={onClose}>Close</Button>
              </div>
            )}

            {/* Scanning Overlay / Guides */}
            {!isLoading && !error && (
              <div className="absolute inset-0 pointer-events-none">
                 {/* Darkened borders to focus attention */}
                 <div className="absolute inset-0 border-[40px] border-black/50"></div>
                 
                 {/* Center scan frame */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/50 rounded-lg">
                    {/* Scanning laser animation */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan-down"></div>
                    
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 -mt-0.5 -ml-0.5"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 -mt-0.5 -mr-0.5"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500 -mb-0.5 -ml-0.5"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 -mb-0.5 -mr-0.5"></div>
                 </div>
              </div>
            )}

            {/* Close Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-30 rounded-full h-8 w-8" 
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
         </div>

         {/* Footer Instructions */}
         <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
               <Camera className="h-4 w-4" />
               <span>Point camera at a barcode</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose} 
              className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white h-8"
            >
              Cancel
            </Button>
         </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScannerModal;