import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vivo_token');
    const user = localStorage.getItem('vivo_usuario');
    if (token && user) {
      try {
        setUsuario(JSON.parse(user));
      } catch (_) {
        localStorage.removeItem('vivo_token');
        localStorage.removeItem('vivo_usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('vivo_token', data.token);
    localStorage.setItem('vivo_usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem('vivo_token');
    localStorage.removeItem('vivo_usuario');
    setUsuario(null);
  };

  const puede = (...roles) => usuario && roles.includes(usuario.rol);

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, login, logout, loading, puede }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
