import { apiClient } from './api-client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantName: string;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tenantSlug: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  refresh: () =>
    apiClient.post<RefreshResponse>('/auth/refresh'),

  logout: () =>
    apiClient.post<void>('/auth/logout'),

  me: () =>
    apiClient.post<AuthUser>('/auth/me'),
};
