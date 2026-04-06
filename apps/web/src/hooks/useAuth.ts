import { useAuthStore, authApi } from '../store/authStore';

export function useAuth() {
  const { user, accessToken, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.register({ name, email, password });
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Continue logout even if API call fails
      }
    }
    clearAuth();
  };

  return {
    user,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    login,
    register,
    logout,
  };
}
