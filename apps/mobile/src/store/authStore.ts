import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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
  isLoading: boolean;
  loadStoredAuth: () => Promise<void>;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  loadStoredAuth: async () => {
    try {
      const [accessToken, userJson] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('user'),
      ]);
      if (accessToken && userJson) {
        set({ user: JSON.parse(userJson), accessToken, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAuth: async (user, accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync('accessToken', accessToken),
      SecureStore.setItemAsync('refreshToken', refreshToken),
      SecureStore.setItemAsync('userId', user.userId),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
    ]);
    set({ user, accessToken, isLoading: false });
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('userId'),
      SecureStore.deleteItemAsync('user'),
    ]);
    set({ user: null, accessToken: null });
  },
}));

export const authMobileApi = {
  login: async (email: string, password: string) => {
    const response = await client.post('/auth/login', { email, password });
    return response.data as { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
  },

  register: async (name: string, email: string, password: string) => {
    const response = await client.post('/auth/register', { name, email, password });
    return response.data as { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
  },

  logout: async (refreshToken: string) => {
    await client.post('/auth/logout', { refreshToken });
  },
};
