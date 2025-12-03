import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventoryItems,
  getInventoryItem,
  getInventoryByBarcode,
  issueInventory,
  receiveInventory,
  adjustInventory,
  getCategories,
  getLowStockItems,
} from '../lib/inventory-api';

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...inventoryKeys.lists(), filters] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  barcode: (barcode: string) => [...inventoryKeys.all, 'barcode', barcode] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  lowStock: () => [...inventoryKeys.all, 'low-stock'] as const,
};

// List inventory items
export function useInventoryItems(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  locationId?: string;
  lowStock?: boolean;
  isActive?: boolean;
} = {}) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => getInventoryItems(params),
  });
}

// Get single inventory item
export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => getInventoryItem(id),
    enabled: !!id,
  });
}

// Get inventory by barcode
export function useInventoryByBarcode(barcode: string) {
  return useQuery({
    queryKey: inventoryKeys.barcode(barcode),
    queryFn: () => getInventoryByBarcode(barcode),
    enabled: !!barcode,
  });
}

// Get categories
export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: getCategories,
  });
}

// Get low stock items
export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: getLowStockItems,
  });
}

// Issue inventory
export function useIssueInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { quantity: number; reference?: string; referenceId?: string; notes?: string };
    }) => issueInventory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
}

// Receive inventory
export function useReceiveInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { quantity: number; unitCost?: number; reference?: string; notes?: string };
    }) => receiveInventory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
}

// Adjust inventory
export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { newQuantity: number; reason: string };
    }) => adjustInventory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
}
