import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        const storedUser = await SecureStore.getItemAsync('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load auth data from secure storage', e);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const login = async (jwtToken: string, userData: User) => {
    try {
      await SecureStore.setItemAsync('token', jwtToken);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      setToken(jwtToken);
      setUser(userData);
    } catch (e) {
      console.error('Failed to save auth data to secure storage', e);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Failed to remove auth data from secure storage', e);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider 
      value={{ 
        token, 
        user,
        isAuthenticated, 
        loading, 
        login, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};