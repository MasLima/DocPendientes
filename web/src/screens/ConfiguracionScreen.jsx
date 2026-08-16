import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ConfiguracionScreen() {
  const { user } = useAuth();
  const puede = (p) => (user.permisos || []).includes(p);
  const puedeSync = puede('sync.ejecutar') || puede('sync.ver_log');
  const puedeUsuarios = puede('config.usuarios');

  if (!puedeSync && !puedeUsuarios) {
    return <div className="vacio">No tienes acceso a configuración</div>;
  }

  const opciones = [];
  if (puedeSync) {
    opciones.push({ ruta: '/configuracion/sync', titulo: 'Sincronización', desc: 'Ejecutar sincronización con el ERP y ver el historial' });
  }
  if (puedeUsuarios) {
    opciones.push({ ruta: '/configuracion/usuarios', titulo: 'Usuarios', desc: 'Crear, editar y desactivar usuarios de la app' });
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Configuración</h2>
      {opciones.map((o) => (
        <Link
          key={o.ruta}
          to={o.ruta}
          className="card"
          style={{ display: 'block', marginBottom: 10, padding: 16, textDecoration: 'none' }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>{o.titulo}</div>
          <div className="mutado" style={{ marginTop: 3 }}>{o.desc}</div>
        </Link>
      ))}
    </div>
  );
}