import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Package,
  MapPin,
  AlertTriangle,
  Plus,
  Minus,
  RefreshCw,
  MoreVertical,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import {
  useInventoryItem,
  useIssueInventory,
  useReceiveInventory,
  useAdjustInventory,
} from '../../hooks/use-inventory';
import { cn } from '../../lib/utils';

interface InventoryDetailPageProps {
  itemId: string;
}

type TransactionMode = 'issue' | 'receive' | 'adjust' | null;

export function InventoryDetailPage({ itemId }: InventoryDetailPageProps) {
  const navigate = useNavigate();
  const [transactionMode, setTransactionMode] = useState<TransactionMode>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const { data: item, isLoading, error } = useInventoryItem(itemId);
  const issueMutation = useIssueInventory();
  const receiveMutation = useReceiveInventory();
  const adjustMutation = useAdjustInventory();

  if (isLoading) {
    return <LoadingScreen message="Loading item..." />;
  }

  if (error || !item) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Item not found"
        description="The inventory item you're looking for doesn't exist"
        action={
          <Button onClick={() => navigate({ to: '/inventory' })}>
            Back to Inventory
          </Button>
        }
      />
    );
  }

  const isLowStock = item.currentStock <= item.reorderPoint;
  const isOutOfStock = item.currentStock === 0;

  const handleTransaction = async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    try {
      if (transactionMode === 'issue') {
        await issueMutation.mutateAsync({
          id: itemId,
          data: { quantity: qty, notes: notes || undefined },
        });
      } else if (transactionMode === 'receive') {
        await receiveMutation.mutateAsync({
          id: itemId,
          data: { quantity: qty, notes: notes || undefined },
        });
      } else if (transactionMode === 'adjust') {
        await adjustMutation.mutateAsync({
          id: itemId,
          data: { newQuantity: qty, reason: notes || 'Manual adjustment' },
        });
      }
      setTransactionMode(null);
      setQuantity('');
      setNotes('');
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  const isPending = issueMutation.isPending || receiveMutation.isPending || adjustMutation.isPending;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/inventory' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {item.itemNumber}
            </span>
            {item.category && (
              <Badge variant="secondary">{item.category}</Badge>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">{item.name}</h1>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Stock Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full',
                isOutOfStock
                  ? 'bg-destructive text-destructive-foreground'
                  : isLowStock
                  ? 'bg-orange-500 text-white'
                  : 'bg-green-500 text-white'
              )}>
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {item.currentStock}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.unit} in stock
                </div>
              </div>
            </div>
            {isOutOfStock && (
              <Badge variant="destructive" className="h-8">Out of Stock</Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge variant="warning" className="h-8">Low Stock</Badge>
            )}
          </div>

          {/* Stock levels */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Minimum</div>
              <div className="font-semibold">{item.minimumStock}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Reorder Point</div>
              <div className="font-semibold">{item.reorderPoint}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Reorder Qty</div>
              <div className="font-semibold">{item.reorderQuantity}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!transactionMode && (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => setTransactionMode('issue')}
            disabled={item.currentStock === 0}
          >
            <Minus className="mr-2 h-4 w-4" />
            Issue
          </Button>
          <Button
            variant="outline"
            onClick={() => setTransactionMode('receive')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Receive
          </Button>
          <Button
            variant="outline"
            onClick={() => setTransactionMode('adjust')}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Adjust
          </Button>
        </div>
      )}

      {/* Transaction Form */}
      {transactionMode && (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{transactionMode} Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quantity">
                {transactionMode === 'adjust' ? 'New Quantity' : 'Quantity'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min={transactionMode === 'issue' ? 1 : 0}
                max={transactionMode === 'issue' ? item.currentStock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={transactionMode === 'adjust' ? item.currentStock.toString() : '0'}
              />
              {transactionMode === 'issue' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Available: {item.currentStock} {item.unit}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="notes">
                {transactionMode === 'adjust' ? 'Reason' : 'Notes'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={transactionMode === 'adjust' ? 'Reason for adjustment...' : 'Optional notes...'}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setTransactionMode(null);
                  setQuantity('');
                  setNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleTransaction}
                disabled={isPending || !quantity}
              >
                {isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardContent className="divide-y p-0">
          {item.description && (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          )}
          {item.location && (
            <div className="flex items-center gap-3 p-4">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium">{item.location.name}</div>
              </div>
            </div>
          )}
          {item.manufacturer && (
            <div className="flex items-center gap-3 p-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Manufacturer</div>
                <div className="font-medium">{item.manufacturer}</div>
              </div>
            </div>
          )}
          {item.partNumber && (
            <div className="p-4">
              <div className="text-sm text-muted-foreground">Part Number</div>
              <div className="font-mono font-medium">{item.partNumber}</div>
            </div>
          )}
          {item.barcode && (
            <div className="p-4">
              <div className="text-sm text-muted-foreground">Barcode</div>
              <div className="font-mono font-medium">{item.barcode}</div>
            </div>
          )}
          {item.unitCost && (
            <div className="p-4">
              <div className="text-sm text-muted-foreground">Unit Cost</div>
              <div className="font-medium">${Number(item.unitCost).toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {item.transactions?.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {item.transactions?.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    tx.quantity > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}>
                    {tx.quantity > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{tx.type}</span>
                      <span className={cn(
                        'font-mono text-sm',
                        tx.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tx.performedBy.firstName} {tx.performedBy.lastName} • {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
