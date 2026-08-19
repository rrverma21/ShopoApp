import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, RefreshCw, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const QRScannerFeed = ({ onScan, isActive = true, disabled = false, cooldownActive = false, cooldownTime = 0 }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef();

  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      setLoading(true);
      setError(null);
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          videoRef.current.setAttribute("playsinline", true);
          await videoRef.current.play();
          requestRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access denied or unavailable.");
      } finally {
        setLoading(false);
      }
    };

    if (isActive && !disabled && !cooldownActive) {
      if (!stream) startCamera();
    } else {
        // We generally keep camera running for cooldown to allow fast resume, 
        // but if disabled=true (e.g. modal open), we might pause processing but keep stream?
        // Actually, pausing stream saves battery.
        if (disabled && stream) {
             stopCamera();
        }
    }

    return () => {
      stopCamera();
    };
  }, [isActive, disabled]); // Removed cooldownActive from dependency to avoid flicker on cooldown start/end if we want to keep stream

  const stopCamera = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
    }
  };

  const tick = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        requestRef.current = requestAnimationFrame(tick);
        return;
    }

    // If cooldown or disabled, we draw but don't process
    if (disabled || cooldownActive) {
        if(canvasRef.current) {
             const ctx = canvasRef.current.getContext('2d');
             ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
             // Add blur effect
             ctx.fillStyle = 'rgba(0,0,0,0.5)';
             ctx.fillRect(0,0, canvasRef.current.width, canvasRef.current.height);
        }
        requestRef.current = requestAnimationFrame(tick);
        return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if(canvas) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // QR Processing
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            // Draw box
            const color = "#00FF00";
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
            ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
            ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
            ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
            ctx.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
            ctx.stroke();
            
            if (code.data) onScan(code.data);
        }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  return (
    <Card className="overflow-hidden bg-black relative w-full h-full min-h-[300px] flex items-center justify-center rounded-xl shadow-xl border-slate-700">
      {error ? (
        <div className="text-center text-white p-6">
          <CameraOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-red-400 mb-4 font-medium">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Camera
          </Button>
        </div>
      ) : (
        <>
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            
            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Frame Markers */}
                <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 rounded-xl transition-all duration-300",
                    cooldownActive ? "border-yellow-500/50 scale-95" : "border-white/50 scale-100"
                )}>
                    {!cooldownActive && !disabled && (
                        <>
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1 rounded-tl-sm"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1 rounded-tr-sm"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1 rounded-bl-sm"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1 rounded-br-sm"></div>
                        </>
                    )}
                </div>

                {/* Status Overlays */}
                {cooldownActive && (
                    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/40 animate-in fade-in">
                        <div className="bg-slate-900/90 text-white px-6 py-4 rounded-xl border border-slate-700 flex flex-col items-center shadow-2xl">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                            <p className="font-semibold text-lg">Processing...</p>
                            <p className="text-sm text-slate-400">Resuming in {Math.ceil(cooldownTime / 1000)}s</p>
                        </div>
                    </div>
                )}

                {disabled && !cooldownActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
                        <div className="text-center text-white/80">
                            <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Scanner Paused</p>
                        </div>
                    </div>
                )}
            </div>
            
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-blue-500/30 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-slate-400 text-sm font-medium">Initializing Camera...</span>
                    </div>
                </div>
            )}
        </>
      )}
    </Card>
  );
};

export default QRScannerFeed;