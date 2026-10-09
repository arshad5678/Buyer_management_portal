import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient.js';
import { loginUser, logoutUser, getMe } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('accessToken') || null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize and validate session on mount or page reload
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = sessionStorage.getItem('accessToken');

      if (storedToken) {
        // We have a stored access token; validate it against /api/auth/me
        try {
          const res = await getMe();
          if (isMounted && res?.data) {
            setUser(res.data);
            setAccessToken(storedToken);
            sessionStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch {
          // Token validation failed and refresh failed in interceptor
          if (isMounted) {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('user');
            setUser(null);
            setAccessToken(null);
          }
        }
      } else {
        // No stored access token; check if an active HttpOnly refresh cookie exists
        try {
          const res = await apiClient.post('/auth/refresh');
          const newToken = res?.data?.data?.accessToken;
          if (newToken && isMounted) {
            sessionStorage.setItem('accessToken', newToken);
            setAccessToken(newToken);

            // Fetch profile using the new access token
            const profileRes = await getMe();
            if (profileRes?.data && isMounted) {
              setUser(profileRes.data);
              sessionStorage.setItem('user', JSON.stringify(profileRes.data));
            }
          }
        } catch {
          // No active session cookie or cookie expired; user is not logged in
          if (isMounted) {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('user');
            setUser(null);
            setAccessToken(null);
          }
        }
      }

      if (isMounted) {
        setIsInitializing(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user, store access token in sessionStorage and update in-memory state.
   */
  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials);
    const token = response?.data?.accessToken;
    const userData = response?.data?.user;

    if (token) {
      sessionStorage.setItem('accessToken', token);
      setAccessToken(token);
    }
    if (userData) {
      sessionStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }

    return response;
  }, []);

  /**
   * Log out user, revoking backend session and clearing client authentication state.
   */
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      // Gracefully continue even if backend call fails (e.g. already revoked or network error)
      console.warn('Backend logout encountered an error, clearing local session:', err);
    } finally {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isInitializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
