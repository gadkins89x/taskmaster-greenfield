import { apiClient } from './api-client';

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
  permissionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

// API functions
export async function getRoles(): Promise<Role[]> {
  return apiClient.get('/roles');
}

export async function getRole(id: string): Promise<Role> {
  return apiClient.get(`/roles/${id}`);
}

export async function getPermissions(): Promise<Permission[]> {
  return apiClient.get('/roles/permissions');
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

export async function createRole(data: CreateRoleData): Promise<Role> {
  return apiClient.post('/roles', data);
}

export async function updateRole(id: string, data: UpdateRoleData): Promise<Role> {
  return apiClient.patch(`/roles/${id}`, data);
}

export async function deleteRole(id: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/roles/${id}`);
}

export async function assignRolePermissions(id: string, permissionIds: string[]): Promise<Role> {
  return apiClient.put(`/roles/${id}/permissions`, { permissionIds });
}
