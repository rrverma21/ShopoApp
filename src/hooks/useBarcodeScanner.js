import { useState, useEffect, useRef, useCallback } from 'react';

export const useBarcodeScanner = ({ onResult }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  const loopRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  }, []);

  const detectBarcode = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current || videoRef.current.paused || videoRef.current.ended) return;

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        if (code) {
            onResult(code);
        }
      }
    } catch (err) {
      // Suppress frequent frame detection errors
    }

    loopRef.current = requestAnimationFrame(detectBarcode);
  }, [onResult]);

  const startCamera = useCallback(async () => {
    // Reset states
    setError(null);
    
    // Check for support immediately
    if (!('BarcodeDetector' in window)) {
      setIsSupported(false);
      setError("Barcode Scanner API is not supported in this browser. Please use Chrome on Android or Enable 'Experimental Web Platform features' in chrome://flags.");
      return;
    }

    try {
      // Initialize detector if not already done
      if (!detectorRef.current) {
          const formats = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
          try {
              const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
              const availableFormats = formats.filter(f => supportedFormats.includes(f));
              detectorRef.current = new window.BarcodeDetector({ formats: availableFormats.length > 0 ? availableFormats : formats });
          } catch (e) {
              console.warn("[useBarcodeScanner] Could not verify formats, trying default", e);
              detectorRef.current = new window.BarcodeDetector({ formats });
          }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready to play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
              setIsStreaming(true);
              detectBarcode();
          }).catch(e => {
              console.error("[useBarcodeScanner] Play error:", e);
              setError("Failed to start video stream.");
          });
        };
      }
    } catch (err) {
      console.error("[useBarcodeScanner] Scanner Error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Camera permission denied. Please allow camera access to scan barcodes.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera device found.");
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, [detectBarcode]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return { 
    videoRef, 
    error, 
    isStreaming, 
    isSupported, 
    stopCamera, 
    restartCamera: startCamera 
  };
};