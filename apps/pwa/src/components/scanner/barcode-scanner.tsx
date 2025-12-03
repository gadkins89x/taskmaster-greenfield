import { useId, useEffect } from 'react';
import { Camera, CameraOff, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useBarcodeScanner, type BarcodeScannerConfig } from '../../hooks/use-barcode-scanner';
import { cn } from '../../lib/utils';

export interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose?: () => void;
  config?: BarcodeScannerConfig;
  className?: string;
  autoStart?: boolean;
  showLastScanned?: boolean;
}

export function BarcodeScanner({
  onScan,
  onClose,
  config,
  className,
  autoStart = true,
  showLastScanned = true,
}: BarcodeScannerProps) {
  const scannerId = useId();

  const {
    isScanning,
    hasCamera,
    error,
    lastScannedCode,
    startScanning,
    stopScanning,
    scannerRef,
  } = useBarcodeScanner(onScan, config);

  // Auto-start scanning on mount
  useEffect(() => {
    if (autoStart && hasCamera) {
      startScanning();
    }
  }, [autoStart, hasCamera, startScanning]);

  // Stop scanning on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className={cn('flex flex-col bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <span className="font-medium">Scan Barcode</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Scanner viewport */}
      <div className="relative flex-1 min-h-[300px] bg-black">
        {/* Scanner element */}
        <div
          id={scannerId.replace(/:/g, '-')}
          ref={scannerRef}
          className="w-full h-full"
        />

        {/* Loading overlay */}
        {!isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Initializing camera...</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              {!hasCamera ? (
                <CameraOff className="h-12 w-12 text-destructive" />
              ) : (
                <AlertCircle className="h-12 w-12 text-destructive" />
              )}
              <span className="text-white text-sm max-w-xs">{error}</span>
              <Button variant="outline" onClick={startScanning} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Scanning guide overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary" />
                {/* Scanning line animation */}
                <div className="absolute inset-x-2 h-0.5 bg-primary/50 animate-pulse top-1/2" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-3">
        {/* Last scanned code */}
        {showLastScanned && lastScannedCode && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Last scanned:</span>
            <code className="text-sm font-mono">{lastScannedCode}</code>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {isScanning ? (
            <Button variant="outline" onClick={stopScanning} className="flex-1">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          ) : (
            <Button onClick={startScanning} className="flex-1" disabled={!hasCamera}>
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-center text-muted-foreground">
          Point your camera at a barcode or QR code to scan
        </p>
      </div>
    </div>
  );
}
