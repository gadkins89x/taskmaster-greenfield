import type { RoleSummary } from './role';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  roles: RoleSummary[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  isActive?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}
