import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ConfiguracionScreen() {
  const { user } = useAuth();
  const puede = (p) => (user.permisos || []).includes(p);
  const puedeSync = puede('sync.ejecutar') || puede('sync.ver_log');
  const puedeUsuarios = puede('config.usuarios');
  const puedePerfiles = puede('config.permisos') || puede('config.ver');

  if (!puedeSync && !puedeUsuarios && !puedePerfiles) {
    return <div className="vacio">No tienes acceso a configuración</div>;
  }

  const opciones = [];
  if (puedeSync) {
    opciones.push({ ruta: '/configuracion/sync', titulo: 'Sincronización', icono: '🔄', desc: 'Ejecutar sincronización con el ERP y ver el historial' });
  }
  if (puedeUsuarios) {
    opciones.push({ ruta: '/configuracion/usuarios', titulo: 'Usuarios', icono: '👥', desc: 'Crear, editar y desactivar usuarios de la app' });
  }
  if (puedePerfiles) {
    opciones.push({ ruta: '/configuracion/perfiles', titulo: 'Perfiles', icono: '🛡️', desc: 'Configurar las opciones de menú y permisos por perfil' });
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Configuración</h2>
      {opciones.map((o) => (
        <Link
          key={o.ruta}
          to={o.ruta}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: 16, textDecoration: 'none' }}
        >
          <span style={{ fontSize: 24 }}>{o.icono}</span>
          <span>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{o.titulo}</span>
            <span className="mutado" style={{ display: 'block', marginTop: 3 }}>{o.desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}