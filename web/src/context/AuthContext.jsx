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
    // Solo se restaura una sesion valida: token + usuario con permisos.
    const t = getToken();
    const u = getUser();
    if (t && u && Array.isArray(u.permisos) && u.permisos.length > 0) {
      setTokenState(t);
      setUser(u);
    } else {
      clearToken();
      clearUser();
    }
    setLoading(false);
  }, []);

  const login = async (use_logi, use_pass) => {
    const data = await apiLogin(use_logi, use_pass);
    setUser(data.usuario);
    setTokenState(data.token);
    setToken(data.token);
    saveUser(data.usuario);
    return data;
  };

  const logout = () => {
    clearToken();
    clearUser();
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