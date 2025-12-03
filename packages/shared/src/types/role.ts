export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}
