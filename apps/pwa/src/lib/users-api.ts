import { apiClient } from './api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  roles: string[];
  roleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API functions
export async function getUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<PaginatedResponse<User>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiClient.get(`/users${query ? `?${query}` : ''}`);
}

export async function getUser(id: string): Promise<User> {
  return apiClient.get(`/users/${id}`);
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds?: string[];
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export async function createUser(data: CreateUserData): Promise<User> {
  return apiClient.post('/users', data);
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return apiClient.patch(`/users/${id}`, data);
}

export async function updateUserPassword(id: string, password: string): Promise<User> {
  return apiClient.patch(`/users/${id}/password`, { password });
}

export async function deactivateUser(id: string): Promise<User> {
  return apiClient.post(`/users/${id}/deactivate`);
}

export async function activateUser(id: string): Promise<User> {
  return apiClient.post(`/users/${id}/activate`);
}

export async function assignUserRoles(id: string, roleIds: string[]): Promise<User> {
  return apiClient.patch(`/users/${id}/roles`, { roleIds });
}
