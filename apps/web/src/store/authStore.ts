import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import client from '../api/client';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  subscription: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userId', user.userId);
        set({ user, accessToken, refreshToken, isLoading: false });
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

// API methods
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await client.post('/auth/register', data);
    return response.data as { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
  },

  login: async (data: { email: string; password: string }) => {
    const response = await client.post('/auth/login', data);
    return response.data as { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
  },

  logout: async (refreshToken: string) => {
    await client.post('/auth/logout', { refreshToken });
  },
};
