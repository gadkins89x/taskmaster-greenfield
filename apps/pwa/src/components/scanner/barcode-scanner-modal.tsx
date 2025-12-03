import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { QrCode, X, Package, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { BarcodeScanner } from './barcode-scanner';
import { apiClient } from '../../lib/api-client';
import { cn } from '../../lib/utils';

export type ScanMode = 'inventory' | 'asset' | 'generic';

export interface ScanResult {
  type: ScanMode;
  code: string;
  data?: InventoryItem | Asset | null;
  error?: string;
}

interface InventoryItem {
  id: string;
  itemNumber: string;
  name: string;
  description?: string;
  category?: string;
  currentStock: number;
  unit: string;
  location?: {
    id: string;
    name: string;
  };
}

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  status: string;
  location?: {
    id: string;
    name: string;
  };
}

interface BarcodeScannerModalProps {
  mode?: ScanMode;
  onScanComplete?: (result: ScanResult) => void;
  trigger?: React.ReactNode;
}

export function BarcodeScannerModal({
  mode = 'inventory',
  onScanComplete,
  trigger,
}: BarcodeScannerModalProps) {
  const [open, setOpen] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState<ScanResult | null>(null);

  const handleScan = useCallback(
    async (code: string) => {
      setIsLooking(true);
      setLookupResult(null);

      try {
        let data = null;
        let error: string | undefined;

        if (mode === 'inventory') {
          try {
            data = await apiClient.get<InventoryItem>(`/inventory/barcode/${encodeURIComponent(code)}`);
          } catch (err) {
            const apiError = err as { statusCode?: number; message?: string };
            if (apiError.statusCode === 404) {
              error = 'No inventory item found with this barcode';
            } else {
              error = apiError.message || 'Failed to lookup inventory item';
            }
          }
        } else if (mode === 'asset') {
          try {
            data = await apiClient.get<Asset>(`/assets/barcode/${encodeURIComponent(code)}`);
          } catch (err) {
            const apiError = err as { statusCode?: number; message?: string };
            if (apiError.statusCode === 404) {
              error = 'No asset found with this barcode';
            } else {
              error = apiError.message || 'Failed to lookup asset';
            }
          }
        }

        const result: ScanResult = {
          type: mode,
          code,
          data,
          error,
        };

        setLookupResult(result);

        if (onScanComplete) {
          onScanComplete(result);
        }
      } finally {
        setIsLooking(false);
      }
    },
    [mode, onScanComplete]
  );

  const handleClose = () => {
    setOpen(false);
    setLookupResult(null);
  };

  const handleContinueScanning = () => {
    setLookupResult(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <QrCode className="h-5 w-5" />
          </Button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full bg-background rounded-lg shadow-lg z-50 flex flex-col max-h-[90vh] overflow-hidden">
          <Dialog.Title className="sr-only">Barcode Scanner</Dialog.Title>
          <Dialog.Description className="sr-only">
            Scan a barcode or QR code to look up {mode === 'inventory' ? 'inventory items' : 'assets'}
          </Dialog.Description>

          {/* Show scanner or result */}
          {!lookupResult ? (
            <BarcodeScanner
              onScan={handleScan}
              onClose={handleClose}
              autoStart
              showLastScanned={false}
              className="flex-1"
            />
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-medium">Scan Result</span>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Result content */}
              <div className="flex-1 p-4 overflow-auto">
                {isLooking ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">Looking up {mode}...</span>
                  </div>
                ) : lookupResult.error ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <span className="text-center">{lookupResult.error}</span>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {lookupResult.code}
                    </code>
                  </div>
                ) : lookupResult.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Found!</span>
                    </div>

                    {mode === 'inventory' ? (
                      <InventoryItemCard item={lookupResult.data as InventoryItem} />
                    ) : mode === 'asset' ? (
                      <AssetCard asset={lookupResult.data as Asset} />
                    ) : (
                      <div className="p-4 bg-muted rounded-lg">
                        <code className="text-sm">{lookupResult.code}</code>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex gap-2">
                <Button variant="outline" onClick={handleContinueScanning} className="flex-1">
                  Scan Another
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Inventory Item Card
function InventoryItemCard({ item }: { item: InventoryItem }) {
  const isLowStock = item.currentStock <= 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.itemNumber}</p>
        </div>
      </div>

      {item.description && (
        <p className="text-sm text-muted-foreground">{item.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Category:</span>
          <span className="ml-2">{item.category || '-'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Location:</span>
          <span className="ml-2">{item.location?.name || '-'}</span>
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg',
          isLowStock ? 'bg-destructive/10' : 'bg-green-500/10'
        )}
      >
        <span className="text-sm font-medium">Current Stock</span>
        <span
          className={cn(
            'text-lg font-bold',
            isLowStock ? 'text-destructive' : 'text-green-600'
          )}
        >
          {item.currentStock} {item.unit}
        </span>
      </div>
    </div>
  );
}

// Asset Card
function AssetCard({ asset }: { asset: Asset }) {
  const statusColors: Record<string, string> = {
    operational: 'bg-green-500/10 text-green-600',
    maintenance: 'bg-yellow-500/10 text-yellow-600',
    offline: 'bg-red-500/10 text-red-600',
    retired: 'bg-gray-500/10 text-gray-600',
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{asset.name}</h3>
          <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full capitalize',
            statusColors[asset.status] || 'bg-gray-500/10'
          )}
        >
          {asset.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {asset.manufacturer && (
          <div>
            <span className="text-muted-foreground">Manufacturer:</span>
            <span className="ml-2">{asset.manufacturer}</span>
          </div>
        )}
        {asset.model && (
          <div>
            <span className="text-muted-foreground">Model:</span>
            <span className="ml-2">{asset.model}</span>
          </div>
        )}
        {asset.serialNumber && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Serial:</span>
            <span className="ml-2 font-mono">{asset.serialNumber}</span>
          </div>
        )}
        {asset.location && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Location:</span>
            <span className="ml-2">{asset.location.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
