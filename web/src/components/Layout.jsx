import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { LogOutIcon, iconoDeMenu } from './Iconos';

export default function Layout() {
  const { user, logout } = useAuth();
  const { esOscuro, alternarTema } = useTema();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(true);
  const permisos = user?.permisos || [];
  const puede = (p) => permisos.includes(p);

  const items = [];
  if (puede('dashboard.ver')) items.push({ ruta: '/', texto: 'Dashboard' });
  if (puede('clientes.ver')) items.push({ ruta: '/clientes', texto: 'Clientes' });
  if (puede('reportes.saldos')) items.push({ ruta: '/reportes', texto: 'Reportes' });
  if (puede('incidencias.ver')) items.push({ ruta: '/incidencias', texto: 'Incidencias' });
  if (puede('sync.ejecutar') || puede('config.usuarios')) {
    items.push({ ruta: '/configuracion', texto: 'Configuración' });
  }

  const salir = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {menuAbierto && (
        <aside
          style={{
            width: 250,
            backgroundColor: 'var(--tarjeta)',
            borderRight: '1px solid var(--borde)',
            flexShrink: 0,
            padding: '18px 0'
          }}
        >
          <div style={{ padding: '0 18px 18px', fontSize: 18, fontWeight: 800, color: 'var(--primario)' }}>
            Cobranza
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((it) => (
              <NavLink
                key={it.ruta}
                to={it.ruta}
                end={it.ruta === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 18px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: isActive ? 'var(--primario)' : 'var(--texto-suave)',
                  backgroundColor: isActive ? 'rgba(26,43,76,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primario)' : '3px solid transparent'
                })}
              >
                {iconoDeMenu(it.ruta)}
                {it.texto}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 56,
            backgroundColor: 'var(--primario)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setMenuAbierto(!menuAbierto)}
              title={menuAbierto ? 'Ocultar menú' : 'Mostrar menú'}
              style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 10px', fontSize: 16, lineHeight: 1 }}
            >
              ☰
            </button>
            <div>
              <div style={{ fontWeight: 700 }}>Sistema de Cobranza</div>
              <div style={{ fontSize: 12, color: '#c8d1e0' }}>
                {user?.nombre || user?.use_logi} · {user?.rol}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost" onClick={alternarTema} style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}>
              {esOscuro ? '☀️ Claro' : '🌙 Oscuro'}
            </button>
            <button className="btn" onClick={salir} style={{ background: '#c0392b', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
              <LogOutIcon size={20} /> Salir
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: 20, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}