import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';

const ROLES = ['admin', 'empleado', 'vendedor'];

const formVacio = { rol: 'vendedor', activo: true };

export default function ConfigUsuariosScreen() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [verForm, setVerForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [u, v] = await Promise.all([
        apiGet('/usuarios', token),
        apiGet('/usuarios/vendedores-disponibles', token)
      ]);
      setUsuarios(Array.isArray(u) ? u : u.value || []);
      setVendedores(Array.isArray(v) ? v : v.value || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...formVacio });
    setError('');
    setVerForm(true);
  };

  const abrirEditar = (u) => {
    setEditando(u);
    setForm({ use_name: u.use_name, use_apel: u.use_apel, rol: u.rol, activo: !!u.activo });
    setError('');
    setVerForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editando) {
        await apiPut(`/usuarios/${editando.id}`, form, token);
      } else {
        await apiPost('/usuarios', form, token);
      }
      setVerForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const desactivar = async (u) => {
    if (!window.confirm(`¿Desactivar ${u.use_logi}?`)) return;
    try {
      await apiDelete(`/usuarios/${u.id}`, token);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  if (verForm) {
    return (
      <div style={{ maxWidth: 560 }}>
        <Link to="/configuracion" className="btn btn-ghost" style={{ display: 'inline-block', marginBottom: 12 }}>← Configuración</Link>
        <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>{editando ? `Editar ${editando.use_logi}` : 'Nuevo usuario'}</h2>

        <form onSubmit={guardar}>
          {!editando && (
            <>
              <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Vendedor del ERP (obligatorio)</label>
              <select className="input" style={{ marginBottom: 12 }} value={form.ter_cote || ''} onChange={(e) => setForm({ ...form, ter_cote: e.target.value })}>
                <option value="">— Seleccionar vendedor —</option>
                {vendedores.map((v) => (
                  <option key={v.ter_cote} value={v.ter_cote}>{v.ter_cote} - {v.ter_deno}</option>
                ))}
              </select>
            </>
          )}

          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Login</label>
          <input
            className="input"
            style={{ marginBottom: 12 }}
            disabled={!!editando}
            value={form.use_logi || ''}
            onChange={(e) => setForm({ ...form, use_logi: e.target.value })}
            autoComplete="off"
          />

          {!editando && (
            <>
              <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Contraseña</label>
              <input
                className="input"
                style={{ marginBottom: 12 }}
                type="password"
                value={form.use_pass || ''}
                onChange={(e) => setForm({ ...form, use_pass: e.target.value })}
              />
            </>
          )}

          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Nombres</label>
          <input className="input" style={{ marginBottom: 12 }} value={form.use_name || ''} onChange={(e) => setForm({ ...form, use_name: e.target.value })} />

          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Apellidos</label>
          <input className="input" style={{ marginBottom: 12 }} value={form.use_apel || ''} onChange={(e) => setForm({ ...form, use_apel: e.target.value })} />

          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Perfil</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className="btn btn-ghost"
                style={{ background: form.rol === r ? 'var(--primario)' : 'var(--fondo)', color: form.rol === r ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)', padding: '8px 14px', borderRadius: 20 }}
                onClick={() => setForm({ ...form, rol: r })}
              >
                {r}
              </button>
            ))}
          </div>

          {editando && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={!!form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              <span className="mutado">Activo</span>
            </label>
          )}

          {error && <div style={{ color: 'var(--rojo)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" type="submit">{editando ? 'Guardar cambios' : 'Crear usuario'}</button>
            <button className="btn btn-ghost" type="button" onClick={() => setVerForm(false)}>Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <Link to="/configuracion" className="btn btn-ghost" style={{ display: 'inline-block', marginBottom: 12 }}>← Configuración</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Usuarios de la app</h2>
        <button className="btn btn-verde" onClick={abrirNuevo}>+ Nuevo usuario</button>
      </div>

      {error && <div style={{ color: 'var(--rojo)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <table className="tabla">
        <thead>
          <tr><th>Login</th><th>Nombre</th><th>Perfil</th><th>Vendedor</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 700 }}>{u.use_logi}</td>
              <td>{u.use_name || ''} {u.use_apel || ''}</td>
              <td><span className="pill">{u.rol}</span></td>
              <td className="mono">{u.ter_cote} {u.vendedor_nombre ? `(${u.vendedor_nombre})` : ''}</td>
              <td>{u.activo ? <span className="badge" style={{ backgroundColor: 'var(--verde)' }}>Activo</span> : <span className="badge" style={{ backgroundColor: 'var(--rojo)' }}>INACTIVO</span>}</td>
              <td>
                <button className="btn" style={{ padding: '6px 10px', fontSize: 12, marginRight: 6 }} onClick={() => abrirEditar(u)}>Editar</button>
                {u.activo && (
                  <button className="btn btn-rojo" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => desactivar(u)}>Desactivar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}