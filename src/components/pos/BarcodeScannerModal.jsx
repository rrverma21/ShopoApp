import React, { useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, Camera, AlertTriangle, ScanLine, RefreshCw, Keyboard } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { cn } from '@/lib/utils';

// Fallback beep for environments where AudioContext might fail or be restricted
const FALLBACK_BEEP_URI = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; 

const BarcodeScannerModal = ({ 
    open, 
    onClose, 
    onDetected,
    title = "Scan Barcode",
    instructions = "Point camera at a barcode. Supports EAN, UPC, Code128, etc."
}) => {
  const lastScannedCodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const isBeepingRef = useRef(false);
  const isProcessingRef = useRef(false);

  const playBeep = useCallback(() => {
    if (isBeepingRef.current) return;
    isBeepingRef.current = true;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(1200, ctx.currentTime); 
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            
            setTimeout(() => {
                if(ctx.state !== 'closed') ctx.close();
                isBeepingRef.current = false;
            }, 200);
        } else {
            const audio = new Audio(FALLBACK_BEEP_URI);
            audio.play().catch(e => console.warn("Fallback audio failed", e));
            setTimeout(() => { isBeepingRef.current = false; }, 300);
        }
    } catch (e) {
        console.error("Audio generation failed", e);
        isBeepingRef.current = false;
    }
  }, []);

  const handleResult = useCallback((code) => {
      if (isProcessingRef.current) return;
      
      const now = Date.now();
      if (code === lastScannedCodeRef.current && (now - lastScanTimeRef.current < 1500)) {
          return;
      }

      console.log(`[BarcodeScannerModal] Code detected: ${code}`);
      isProcessingRef.current = true;
      lastScannedCodeRef.current = code;
      lastScanTimeRef.current = now;

      playBeep();

      if (onDetected) {
          try {
              onDetected(code);
          } catch (e) {
              console.error("[BarcodeScannerModal] Error in onDetected callback:", e);
          }
      }

      setTimeout(() => {
          isProcessingRef.current = false;
      }, 800);
  }, [onDetected, playBeep]);

  // Hook for camera
  const { videoRef, error, isStreaming, stopCamera, restartCamera } = useBarcodeScanner({
      onResult: handleResult
  });

  const handleManualClose = () => {
    stopCamera();
    if (onClose) onClose();
  };

  // Reset internal states when opened
  useEffect(() => {
      if (open) {
          lastScannedCodeRef.current = null;
          isProcessingRef.current = false;
      } else {
          stopCamera();
      }
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleManualClose()}>
        <DialogContent className="sm:max-w-md w-full h-[100dvh] sm:h-[600px] p-0 bg-slate-950 border-slate-800 overflow-hidden flex flex-col rounded-none sm:rounded-2xl z-[100]">
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent pb-12">
                <div className="text-white px-2">
                    <h3 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                        <ScanLine className="w-6 h-6 text-blue-400" /> {title}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1 font-medium opacity-90 line-clamp-1">
                        {instructions}
                    </p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 rounded-full h-10 w-10 transition-all hover:rotate-90 bg-black/40 backdrop-blur-md"
                    onClick={handleManualClose}
                >
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Main Viewport */}
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                {!error ? (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                        {/* Video Element */}
                        <video 
                            ref={videoRef} 
                            className={cn(
                                "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
                                isStreaming ? "opacity-100" : "opacity-0"
                            )}
                            playsInline 
                            muted
                        />
                        
                        {/* Loading State */}
                        {!isStreaming && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                                <div className="flex flex-col items-center gap-3">
                                    <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                                    <p className="text-blue-400 font-medium animate-pulse">Initializing Camera...</p>
                                </div>
                            </div>
                        )}

                        {/* Scanner UI Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                            {/* Frame */}
                            <div className="relative w-full max-w-[280px] aspect-square border-2 border-blue-500/30 rounded-3xl overflow-hidden bg-white/5 backdrop-blur-[2px] shadow-2xl">
                                {/* Scanning Laser */}
                                {isStreaming && (
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scan_2.5s_ease-in-out_infinite]" />
                                )}
                                
                                {/* Corner Markers */}
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                                
                                {/* Center Target */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                    <ScanLine className="w-16 h-16 text-white" />
                                </div>
                            </div>

                            {/* Recent Scan Feedback */}
                            {lastScannedCodeRef.current && (
                                <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in">
                                    <div className="bg-green-500/90 backdrop-blur-md border border-green-400 text-white px-5 py-2.5 rounded-full font-mono text-sm flex items-center gap-2 shadow-lg">
                                        <ScanLine className="w-4 h-4" />
                                        Detected: <span className="font-bold tracking-wider">{lastScannedCodeRef.current}</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Helper Text */}
                            {!lastScannedCodeRef.current && isStreaming && (
                                <div className="mt-8 text-white text-sm font-medium bg-black/60 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2">
                                    <ScanLine className="w-4 h-4 text-blue-400" /> Scanning...
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Error State */
                    <div className="p-6 w-full max-w-md mx-auto animate-in zoom-in-95 duration-300 z-30">
                        <Alert variant="destructive" className="bg-red-950/90 border-red-800 text-red-200 backdrop-blur-xl">
                            <AlertTriangle className="h-6 w-6" />
                            <AlertTitle className="text-lg font-bold ml-2">Camera Access Denied</AlertTitle>
                            <AlertDescription className="mt-2 text-sm opacity-90 leading-relaxed ml-2">
                                Please grant camera permissions, or enter the barcode manually.
                                <div className="mt-3 text-xs opacity-75 font-mono">
                                    Error details: {error}
                                </div>
                            </AlertDescription>
                        </Alert>
                        <div className="mt-6 flex flex-col gap-3">
                            <Button 
                                className="w-full bg-white text-black hover:bg-gray-200 font-semibold h-12"
                                onClick={restartCamera}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Retry Camera
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-12"
                                onClick={handleManualClose}
                            >
                                <Keyboard className="w-4 h-4 mr-2" /> Enter Manually
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0.5; }
                }
            `}</style>
        </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerModal;