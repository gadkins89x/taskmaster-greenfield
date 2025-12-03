export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface PaginationMeta extends ResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    storage: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
}
