import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  login as apiLogin,
  getToken, setToken, clearToken,
  getUser, setUser as saveUser, clearUser
} from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([getToken(), getUser()]);
        if (t) setTokenState(t);
        if (u) setUser(u);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (use_logi, use_pass) => {
    const data = await apiLogin(use_logi, use_pass);
    setUser(data.usuario);
    setTokenState(data.token);
    await Promise.all([setToken(data.token), saveUser(data.usuario)]);
    return data;
  };

  const logout = async () => {
    await Promise.all([clearToken(), clearUser()]);
    setUser(null);
    setTokenState(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}