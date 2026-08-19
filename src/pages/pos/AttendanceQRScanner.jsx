import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Scan, Terminal, X, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

// Components
import QRScannerFeed from '@/components/pos/employees/QRScannerFeed';
import ConfirmAttendanceModal from '@/components/pos/employees/ConfirmAttendanceModal';
import ScanHistoryList from '@/components/pos/employees/ScanHistoryList';

// Logic & Feedback
import { analyzeAttendanceQR, recordAttendance } from '@/lib/attendanceLogic';
import { playSuccessBeep, playErrorBeep, triggerFlashAnimation } from '@/lib/scanFeedback';

const AttendanceQRScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [scannerState, setScannerState] = useState('active'); // active, analyzing, confirming, processing, cooldown, error
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [scanType, setScanType] = useState('check_in');
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cooldownTime, setCooldownTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Debug State
  const [debugInfo, setDebugInfo] = useState(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const COOLDOWN_DURATION = 3000; // 3 seconds

  // Timer for clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer for cooldown
  useEffect(() => {
    let timer;
    if (scannerState === 'cooldown' && cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 100) {
            setScannerState('active');
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [scannerState, cooldownTime]);

  const handleScan = async (qrData) => {
    if (scannerState !== 'active') return;

    setScannerState('analyzing');
    triggerFlashAnimation();

    // Store raw data for debug
    setDebugInfo({ raw: qrData, timestamp: new Date().toISOString() });

    // 1. Analyze Scan
    // The logic inside analyzeAttendanceQR handles validation, querying, and error formatting
    const result = await analyzeAttendanceQR(qrData);

    // Update debug info with analysis result
    setDebugInfo(prev => ({ 
        ...prev, 
        extractedId: result.extractedId,
        lookupResult: result.success ? 'Found' : 'Failed',
        error: result.error,
        message: result.message
    }));

    if (result.success) {
      setCurrentEmployee(result.employee);
      setScanType(result.scanType);
      setAttendanceRecord(result.attendance);
      setScannerState('confirming'); // Open Modal
    } else {
      // Error Handling
      playErrorBeep();
      setErrorMessage(result.message);
      setScannerState('error');
      
      toast({
        variant: "destructive",
        title: "Scan Error",
        description: result.message
      });

      // Auto clear error after 3s (increased for readability)
      setTimeout(() => {
        setScannerState('active');
        setErrorMessage(null);
      }, 3000);
    }
  };

  const handleConfirm = async () => {
    setScannerState('processing');
    
    // Get simple device info
    const deviceInfo = {
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        platform: navigator.platform
    };

    const result = await recordAttendance(
        currentEmployee.id, 
        scanType, 
        deviceInfo, 
        'kiosk-ip', 
        attendanceRecord
    );

    if (result.success) {
        playSuccessBeep();
        
        // Add to history
        const newHistoryItem = {
            id: Date.now(),
            employeeName: currentEmployee.name,
            type: scanType,
            timestamp: new Date(),
            status: 'success'
        };
        setScanHistory(prev => [newHistoryItem, ...prev].slice(0, 50));

        toast({
            title: scanType === 'check_in' ? "Checked In!" : "Checked Out!",
            description: `Successfully recorded for ${currentEmployee.name}`,
            className: "bg-green-50 border-green-200 text-green-900"
        });

        // Start Cooldown
        setCooldownTime(COOLDOWN_DURATION);
        setScannerState('cooldown');
    } else {
        playErrorBeep();
        toast({
            variant: "destructive",
            title: "Recording Failed",
            description: result.message
        });
        setScannerState('active'); 
    }
    
    // Clear temp data
    setCurrentEmployee(null);
  };

  const handleCancel = () => {
    setScannerState('active');
    setCurrentEmployee(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => navigate('/pos/employees/attendance')}>
                <ArrowLeft className="w-5 h-5 mr-2" /> Exit Kiosk
            </Button>
            <div className="hidden sm:block h-6 w-px bg-slate-700"></div>
            <h1 className="text-lg font-semibold tracking-tight hidden sm:block">Attendance Scanner</h1>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Status Badge */}
            <Badge variant="outline" className={cn(
                "px-3 py-1 border transition-colors duration-300",
                scannerState === 'active' ? "border-green-500/50 text-green-400 bg-green-500/10" :
                scannerState === 'analyzing' ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" :
                scannerState === 'confirming' ? "border-blue-500/50 text-blue-400 bg-blue-500/10" :
                scannerState === 'error' ? "border-red-500/50 text-red-400 bg-red-500/10" :
                "border-slate-500 text-slate-400"
            )}>
                <span className="relative flex h-2 w-2 mr-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", scannerState === 'active' ? "bg-green-400" : "hidden")}></span>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", 
                    scannerState === 'active' ? "bg-green-500" : 
                    scannerState === 'error' ? "bg-red-500" : "bg-slate-500"
                  )}></span>
                </span>
                {scannerState === 'active' ? "READY TO SCAN" : 
                 scannerState === 'analyzing' ? "PROCESSING..." : 
                 scannerState === 'confirming' ? "WAITING INPUT" :
                 scannerState === 'cooldown' ? "SAVED" : "ERROR"}
            </Badge>

            <div className="text-right">
                <div className="text-xl font-mono font-bold text-slate-200 leading-none">
                    {format(currentTime, 'HH:mm')}
                </div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {format(currentTime, 'MMM dd, yyyy')}
                </div>
            </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left: Camera Section */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full relative">
            <div className="relative flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ring-1 ring-slate-700/50 min-h-[400px]">
                <QRScannerFeed 
                    onScan={handleScan} 
                    isActive={true} 
                    disabled={scannerState !== 'active'}
                    cooldownActive={scannerState === 'cooldown'}
                    cooldownTime={cooldownTime}
                />
                
                {/* Instructions Overlay */}
                {scannerState === 'active' && (
                    <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/90 text-sm animate-bounce">
                            <Scan className="w-4 h-4" /> Point camera at Employee QR Code
                        </div>
                    </div>
                )}

                {/* Error Overlay */}
                {scannerState === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 animate-in fade-in">
                        <div className="flex flex-col items-center text-center p-6 max-w-sm">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Scan Failed</h3>
                            <p className="text-slate-300">{errorMessage || "Could not process QR code"}</p>
                            {debugInfo && (
                                <div className="mt-4 p-2 bg-black/50 rounded text-xs text-red-300 font-mono break-all max-w-full">
                                    Raw: {debugInfo.raw}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Debug Console Overlay */}
            <div className="absolute bottom-4 right-4 z-30">
                <Collapsible open={isDebugOpen} onOpenChange={setIsDebugOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-slate-900/80 backdrop-blur border-slate-700 text-slate-400 hover:text-white">
                            <Terminal className="w-3 h-3 mr-2" /> {isDebugOpen ? 'Hide Debug' : 'Show Debug'}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <Card className="w-80 mt-2 bg-slate-900/90 border-slate-700 backdrop-blur-lg shadow-xl">
                            <CardContent className="p-3 text-xs font-mono space-y-2">
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                                    <span className="font-bold text-slate-300">Scanner Debug</span>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-slate-700 rounded-sm" onClick={() => setDebugInfo(null)}>
                                        <Trash2 className="h-3 w-3 text-slate-500" />
                                    </Button>
                                </div>
                                {debugInfo ? (
                                    <>
                                        <div><span className="text-slate-500">Raw Data:</span> <span className="text-blue-300 break-all">{debugInfo.raw}</span></div>
                                        <div><span className="text-slate-500">Extracted ID:</span> <span className="text-green-300 break-all">{debugInfo.extractedId || 'N/A'}</span></div>
                                        <div><span className="text-slate-500">Result:</span> <span className={debugInfo.lookupResult === 'Found' ? 'text-green-400' : 'text-red-400'}>{debugInfo.lookupResult}</span></div>
                                        {debugInfo.error && <div><span className="text-red-500">Error:</span> <span className="text-red-300">{debugInfo.error}</span></div>}
                                        {debugInfo.message && <div><span className="text-slate-500">Msg:</span> <span className="text-slate-300">{debugInfo.message}</span></div>}
                                        <div className="text-slate-600 text-[10px] mt-2 pt-2 border-t border-slate-800">{debugInfo.timestamp}</div>
                                    </>
                                ) : (
                                    <div className="text-slate-500 italic py-2 text-center">No recent scan data</div>
                                )}
                            </CardContent>
                        </Card>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div>

        {/* Right: History & Info */}
        <div className="lg:col-span-4 h-full flex flex-col gap-4 min-h-[300px]">
            <ScanHistoryList scans={scanHistory} />
            
            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 h-12" onClick={() => window.location.reload()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Reload App
                </Button>
                <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 h-12" onClick={() => navigate('/pos/employees')}>
                    Manage Staff
                </Button>
            </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmAttendanceModal 
        open={scannerState === 'confirming'}
        employee={currentEmployee}
        scanType={scanType}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default AttendanceQRScanner;