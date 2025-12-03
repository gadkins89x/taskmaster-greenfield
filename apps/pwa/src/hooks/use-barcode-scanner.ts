import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface BarcodeScannerConfig {
  fps?: number;
  qrbox?: { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  formatsToSupport?: Html5QrcodeSupportedFormats[];
}

export interface UseBarcodeScanner {
  isScanning: boolean;
  hasCamera: boolean;
  error: string | null;
  lastScannedCode: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
  scannerRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_CONFIG: BarcodeScannerConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  disableFlip: false,
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
  ],
};

export function useBarcodeScanner(
  onScan: (code: string) => void,
  config: BarcodeScannerConfig = {}
): UseBarcodeScanner {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      setLastScannedCode(decodedText);
      onScan(decodedText);
    },
    [onScan]
  );

  const startScanning = useCallback(async () => {
    if (!scannerRef.current) {
      setError('Scanner element not found');
      return;
    }

    setError(null);

    try {
      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setHasCamera(false);
        setError('No camera found on this device');
        return;
      }

      // Create scanner instance if not exists
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);
      }

      // Start scanning with back camera preferred
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: mergedConfig.fps,
          qrbox: mergedConfig.qrbox,
          aspectRatio: mergedConfig.aspectRatio,
          disableFlip: mergedConfig.disableFlip,
        },
        handleScanSuccess,
        () => {
          // QR Code scan failed - this is called frequently, ignore
        }
      );

      setIsScanning(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
      setError(errorMessage);

      // Check for permission denied
      if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
        setError('Camera permission denied. Please allow camera access to scan barcodes.');
      }
    }
  }, [handleScanSuccess, mergedConfig]);

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  }, [isScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  return {
    isScanning,
    hasCamera,
    error,
    lastScannedCode,
    startScanning,
    stopScanning,
    scannerRef,
  };
}
