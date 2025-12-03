export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

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

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  permissions: string[];
}
