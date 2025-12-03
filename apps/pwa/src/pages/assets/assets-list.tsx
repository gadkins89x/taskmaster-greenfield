import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Search,
  Settings2,
  QrCode,
  MapPin,
  Wrench,
  AlertCircle,
  Power,
  PowerOff,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { BarcodeScannerModal } from '../../components/scanner/barcode-scanner-modal';
import { useAssets } from '../../hooks/use-assets';
import { cn } from '../../lib/utils';
import type { AssetStatus } from '../../lib/assets-api';

const statusConfig: Record<AssetStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'; icon: typeof Power }> = {
  operational: { label: 'Operational', variant: 'default', icon: Power },
  maintenance: { label: 'In Maintenance', variant: 'warning', icon: Wrench },
  offline: { label: 'Offline', variant: 'secondary', icon: PowerOff },
  retired: { label: 'Retired', variant: 'outline', icon: AlertCircle },
};

export function AssetsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [showScanner, setShowScanner] = useState(false);

  const { data, isLoading, error } = useAssets({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  });

  const handleAssetFound = (result: { type: 'asset'; id: string }) => {
    setShowScanner(false);
    navigate({ to: '/assets/$assetId', params: { assetId: result.id } });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading assets..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error loading assets"
        description="There was a problem loading the assets list"
        action={
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        }
      />
    );
  }

  const assets = data?.data || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowScanner(true)}
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssetStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <Settings2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assets List */}
      {assets.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title="No assets found"
          description={search || statusFilter !== 'all' ? "Try adjusting your search or filters" : "No assets have been added yet"}
        />
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const status = statusConfig[asset.status];
            const StatusIcon = status.icon;

            return (
              <Card
                key={asset.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate({ to: '/assets/$assetId', params: { assetId: asset.id } })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      asset.status === 'operational' && 'bg-green-500/10 text-green-600',
                      asset.status === 'maintenance' && 'bg-orange-500/10 text-orange-600',
                      asset.status === 'offline' && 'bg-gray-500/10 text-gray-600',
                      asset.status === 'retired' && 'bg-red-500/10 text-red-600'
                    )}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {asset.assetTag}
                        </span>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      <h3 className="font-medium truncate mt-0.5">{asset.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {asset.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {asset.location.name}
                          </span>
                        )}
                        {asset.manufacturer && (
                          <span className="truncate">
                            {asset.manufacturer} {asset.model && `/ ${asset.model}`}
                          </span>
                        )}
                      </div>
                      {asset.openWorkOrdersCount > 0 && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Wrench className="h-3 w-3 mr-1" />
                            {asset.openWorkOrdersCount} open work order{asset.openWorkOrdersCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination info */}
      {data?.meta && data.meta.total > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {assets.length} of {data.meta.total} assets
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onResult={handleAssetFound}
        mode="asset"
      />
    </div>
  );
}
