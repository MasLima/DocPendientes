import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPut } from '../api/client';

const PERMISOS_OBLIGATORIOS = {
  admin: ['clientes.ver', 'config.ver', 'config.permisos'],
  gerencia: ['clientes.ver', 'config.ver', 'config.permisos'],
  sistemas: ['clientes.ver', 'config.ver', 'config.permisos'],
  empleado: ['clientes.ver'],
  contabilidad: ['clientes.ver'],
  vendedor: ['clientes.ver']
};

export default function ConfigPerfilesScreen() {
  const { token } = useAuth();
  const [perfiles, setPerfiles] = useState([]);
  const [modulos, setModulos] = useState({});
  const [perfilSel, setPerfilSel] = useState(null);
  const [temp, setTemp] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet('/perfiles', token);
      setPerfiles(data.perfiles || []);
      setModulos(data.modulos || {});
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirPerfil = (p) => {
    setPerfilSel(p);
    setTemp([...(p.permisos || [])]);
    setMensaje('');
  };

  const toggle = (codigo) => {
    const obligatorio = (PERMISOS_OBLIGATORIOS[perfilSel?.rol] || []).includes(codigo);
    if (obligatorio) return;
    setTemp((prev) => (prev.includes(codigo) ? prev.filter((x) => x !== codigo) : [...prev, codigo]));
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      await apiPut(`/perfiles/${perfilSel.rol}`, { permisos: temp }, token);
      setMensaje('Perfil actualizado correctamente');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Link to="/configuracion" className="btn btn-ghost" style={{ display: 'inline-block', marginBottom: 12 }}>← Configuración</Link>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Perfiles</h2>

      {error && <div style={{ color: 'var(--rojo)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {!perfilSel ? (
        <>
          <p className="mutado" style={{ marginTop: 0 }}>Selecciona un perfil para ver y editar sus opciones de menú (permisos).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {perfiles.map((p) => (
              <div key={p.rol} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{p.rol}</div>
                  <div className="mutado">{p.permisos.length} permisos</div>
                </div>
                <button className="btn" onClick={() => abrirPerfil(p)}>Editar opciones</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>Perfil: {perfilSel.rol}</div>
            <button className="btn btn-ghost" onClick={() => setPerfilSel(null)}>← Volver a perfiles</button>
          </div>
          <p className="mutado" style={{ marginTop: 0 }}>Marca las opciones del menú que tendrá este perfil.</p>

          {Object.entries(modulos).map(([modulo, lista]) => (
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', textTransform: 'capitalize', marginBottom: 6 }}>{modulo}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lista.map((p) => {
                  const obligatorio = (PERMISOS_OBLIGATORIOS[perfilSel.rol] || []).includes(p.codigo);
                  return (
                    <label key={p.codigo} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: obligatorio ? 'not-allowed' : 'pointer' }}>
                      <input type="checkbox" checked={temp.includes(p.codigo)} disabled={obligatorio} onChange={() => toggle(p.codigo)} />
                      <span style={{ fontSize: 13 }}>{p.descripcion} {obligatorio && <span className="mutado">(obligatorio)</span>}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {mensaje && <div style={{ color: 'var(--verde)', fontSize: 13, marginBottom: 10 }}>{mensaje}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
            <button className="btn btn-ghost" onClick={() => setPerfilSel(null)}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  );
}