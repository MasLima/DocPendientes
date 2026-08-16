import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [use_logi, setLogin] = useState('');
  const [use_pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async (e) => {
    e.preventDefault();
    if (!use_logi || !use_pass) {
      setError('Ingresa usuario y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(use_logi, use_pass);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--fondo)',
        padding: 24
      }}
    >
      <form
        onSubmit={onLogin}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--tarjeta)',
          border: '1px solid var(--borde)',
          borderRadius: 12,
          padding: '28px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0, textAlign: 'center', color: 'var(--primario)' }}>
          Cobranza
        </h1>
        <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--texto-suave)', margin: '4px 0 24px' }}>
          Gestión de documentos pendientes
        </p>

        <input
          className="input"
          style={{ marginBottom: 14 }}
          placeholder="Usuario"
          value={use_logi}
          onChange={(e) => setLogin(e.target.value)}
          autoCapitalize="none"
          autoComplete="username"
        />
        <input
          className="input"
          style={{ marginBottom: 14 }}
          placeholder="Contraseña"
          type="password"
          value={use_pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <div style={{ color: 'var(--rojo)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button className="btn" type="submit" disabled={loading} style={{ width: '100%', padding: 14, fontSize: 16 }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}