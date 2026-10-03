import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthResponse } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  registerClinic: (data: any) => Promise<void>;
  logout: () => void;
  updateUserClinicInfo: (data: Partial<AuthResponse>) => void;
  hasRole: (role: string) => boolean;
  roles: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthResponse | null>(() => {
    const saved = localStorage.getItem('docos_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // Ensure roles is an array
      if (!parsed.roles) {
        parsed.roles = parsed.role ? [parsed.role] : [];
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('docos_token');
    if (token && user) {
      setUser(user);
    } else {
      localStorage.removeItem('docos_token');
      localStorage.removeItem('docos_user');
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authApi.login(credentials);
    if (!res.roles && (res as any).role) {
      res.roles = [(res as any).role];
    }
    localStorage.setItem('docos_token', res.token);
    localStorage.setItem('docos_user', JSON.stringify(res));
    setUser(res);
  };

  const registerClinic = async (data: any) => {
    const res = await authApi.registerClinic(data);
    if (!res.roles && (res as any).role) {
      res.roles = [(res as any).role];
    }
    localStorage.setItem('docos_token', res.token);
    localStorage.setItem('docos_user', JSON.stringify(res));
    setUser(res);
  };

  const logout = () => {
    localStorage.removeItem('docos_token');
    localStorage.removeItem('docos_user');
    setUser(null);
  };

  const updateUserClinicInfo = (data: Partial<AuthResponse>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('docos_user', JSON.stringify(updated));
    }
  };

  const roles = user?.roles ?? [];

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerClinic,
        logout,
        updateUserClinicInfo,
        hasRole,
        roles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
