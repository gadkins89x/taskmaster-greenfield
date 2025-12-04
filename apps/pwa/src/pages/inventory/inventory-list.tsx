import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Package,
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  QrCode,
  MapPin,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { BarcodeScannerModal } from '../../components/scanner';
import { useInventoryItems, useCategories } from '../../hooks/use-inventory';
import { cn } from '../../lib/utils';

export function InventoryListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useInventoryItems({
    search: search || undefined,
    category: categoryFilter || undefined,
    lowStock: lowStockFilter || undefined,
  });

  const { data: categories } = useCategories();

  const handleBarcodeScan = (result: { code: string; data?: unknown; error?: string }) => {
    if (result.data && typeof result.data === 'object' && 'id' in result.data) {
      navigate({ to: `/inventory/${(result.data as { id: string }).id}` });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading inventory..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error loading inventory"
        description="Please try again later"
        action={
          <Button onClick={() => window.location.reload()}>Retry</Button>
        }
      />
    );
  }

  const items = data?.data ?? [];
  const hasFilters = categoryFilter || lowStockFilter || search;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} items
          </p>
        </div>
        <BarcodeScannerModal
          mode="inventory"
          onScanComplete={handleBarcodeScan}
          trigger={
            <Button variant="outline">
              <QrCode className="mr-2 h-4 w-4" />
              Scan
            </Button>
          }
        />
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-3">
            <NativeSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Low stock only</span>
            </label>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                  setLowStockFilter(false);
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Inventory List */}
      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? 'No matching items' : 'No inventory items'}
          description={
            hasFilters
              ? 'Try adjusting your filters'
              : 'Add inventory items to get started'
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isLowStock = item.currentStock <= item.reorderPoint;
            const isOutOfStock = item.currentStock === 0;

            return (
              <Link key={item.id} to="/inventory/$itemId" params={{ itemId: item.id }}>
                <Card className="p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isOutOfStock
                        ? 'bg-destructive/10 text-destructive'
                        : isLowStock
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-primary/10 text-primary'
                    )}>
                      <Package className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {item.itemNumber}
                        </span>
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        {isOutOfStock && (
                          <Badge variant="destructive">Out of Stock</Badge>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <Badge variant="warning">Low Stock</Badge>
                        )}
                      </div>
                      <h3 className="mt-1 font-medium leading-tight">{item.name}</h3>

                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={cn(
                          'font-medium',
                          isOutOfStock
                            ? 'text-destructive'
                            : isLowStock
                            ? 'text-orange-500'
                            : 'text-foreground'
                        )}>
                          {item.currentStock} {item.unit}
                        </span>
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.location.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
