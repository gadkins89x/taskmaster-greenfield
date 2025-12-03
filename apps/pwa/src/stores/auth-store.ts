import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '../lib/api-client';
import { authApi, type AuthUser, type LoginRequest, type RegisterRequest } from '../lib/auth-api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);
          apiClient.setAccessToken(response.accessToken);
          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          const message = (err as { message?: string })?.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          apiClient.setAccessToken(response.accessToken);
          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          const message = (err as { message?: string })?.message || 'Registration failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        } finally {
          apiClient.setAccessToken(null);
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await authApi.refresh();
          apiClient.setAccessToken(response.accessToken);
          set({ accessToken: response.accessToken });
          return true;
        } catch {
          // Refresh failed, clear auth state
          apiClient.setAccessToken(null);
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'taskmaster-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore access token to API client on rehydration
        if (state?.accessToken) {
          apiClient.setAccessToken(state.accessToken);
        }
      },
    }
  )
);
