import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Power,
  Wrench,
  PowerOff,
  AlertCircle,
  MapPin,
  Calendar,
  Shield,
  MoreVertical,
  Settings2,
  Package,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { useAsset } from '../../hooks/use-assets';
import { cn } from '../../lib/utils';
import type { AssetStatus } from '../../lib/assets-api';

interface AssetDetailPageProps {
  assetId: string;
}

const statusConfig: Record<AssetStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'; icon: typeof Power; bgColor: string }> = {
  operational: { label: 'Operational', variant: 'default', icon: Power, bgColor: 'bg-green-500' },
  maintenance: { label: 'In Maintenance', variant: 'warning', icon: Wrench, bgColor: 'bg-orange-500' },
  offline: { label: 'Offline', variant: 'secondary', icon: PowerOff, bgColor: 'bg-gray-500' },
  retired: { label: 'Retired', variant: 'outline', icon: AlertCircle, bgColor: 'bg-red-500' },
};

export function AssetDetailPage({ assetId }: AssetDetailPageProps) {
  const navigate = useNavigate();
  const { data: asset, isLoading, error } = useAsset(assetId);

  if (isLoading) {
    return <LoadingScreen message="Loading asset..." />;
  }

  if (error || !asset) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Asset not found"
        description="The asset you're looking for doesn't exist"
        action={
          <Button onClick={() => navigate({ to: '/assets' })}>
            Back to Assets
          </Button>
        }
      />
    );
  }

  const status = statusConfig[asset.status];
  const StatusIcon = status.icon;

  const isWarrantyExpired = asset.warrantyExpires && new Date(asset.warrantyExpires) < new Date();
  const warrantyExpiresInDays = asset.warrantyExpires
    ? Math.ceil((new Date(asset.warrantyExpires).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/assets' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {asset.assetTag}
            </span>
            {asset.category && (
              <Badge variant="secondary">{asset.category}</Badge>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">{asset.name}</h1>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full text-white',
                status.bgColor
              )}>
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <Badge variant={status.variant} className="mb-1">
                  {status.label}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Current Status
                </div>
              </div>
            </div>
          </div>

          {/* Work Order Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{asset.workOrderStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Work Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{asset.workOrderStats.open}</div>
              <div className="text-sm text-muted-foreground">Open Work Orders</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/work-orders/new', search: { assetId: asset.id } })}
        >
          <Wrench className="mr-2 h-4 w-4" />
          Create Work Order
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/work-orders', search: { assetId: asset.id } })}
        >
          <FileText className="mr-2 h-4 w-4" />
          View History
        </Button>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Details</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {asset.serialNumber && (
            <div className="p-4">
              <div className="text-sm text-muted-foreground">Serial Number</div>
              <div className="font-mono font-medium">{asset.serialNumber}</div>
            </div>
          )}
          {asset.manufacturer && (
            <div className="flex items-center gap-3 p-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Manufacturer</div>
                <div className="font-medium">{asset.manufacturer}</div>
              </div>
            </div>
          )}
          {asset.model && (
            <div className="flex items-center gap-3 p-4">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="font-medium">{asset.model}</div>
              </div>
            </div>
          )}
          {asset.location && (
            <div className="flex items-center gap-3 p-4">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium">{asset.location.name}</div>
                {asset.location.code && (
                  <div className="font-mono text-xs text-muted-foreground">
                    {asset.location.code}
                  </div>
                )}
              </div>
            </div>
          )}
          {asset.purchaseDate && (
            <div className="flex items-center gap-3 p-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Purchase Date</div>
                <div className="font-medium">
                  {new Date(asset.purchaseDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          {asset.warrantyExpires && (
            <div className="flex items-center gap-3 p-4">
              <Shield className={cn(
                'h-4 w-4',
                isWarrantyExpired ? 'text-red-500' : 'text-muted-foreground'
              )} />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Warranty Expires</div>
                <div className="font-medium">
                  {new Date(asset.warrantyExpires).toLocaleDateString()}
                </div>
              </div>
              {isWarrantyExpired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : warrantyExpiresInDays !== null && warrantyExpiresInDays <= 30 ? (
                <Badge variant="warning">{warrantyExpiresInDays} days left</Badge>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Specifications */}
      {asset.specifications && Object.keys(asset.specifications).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Specifications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {Object.entries(asset.specifications).map(([key, value]) => (
              <div key={key} className="p-4">
                <div className="text-sm text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="font-medium">{String(value)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Created</div>
              <div>{new Date(asset.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Updated</div>
              <div>{new Date(asset.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
