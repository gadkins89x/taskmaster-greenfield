const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Initialize token from localStorage synchronously to avoid race conditions
function getInitialToken(): string | null {
  try {
    const stored = localStorage.getItem('taskmaster-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.accessToken || null;
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

class ApiClient {
  private accessToken: string | null = getInitialToken();

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for refresh token
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'Network error',
        statusCode: response.status,
      }));
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const json = await response.json();

    // The API wraps all responses in { data: T, meta: {...} } format
    // For paginated responses (with meta.total), preserve the full structure
    // For non-paginated responses, unwrap to just return the data
    if (json && typeof json === 'object' && 'data' in json) {
      const meta = json.meta as { total?: number } | undefined;
      // If meta has pagination fields (total), return full response for pagination
      if (meta && typeof meta.total === 'number') {
        return json as T;
      }
      // Otherwise unwrap the data
      return json.data as T;
    }

    return json;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
