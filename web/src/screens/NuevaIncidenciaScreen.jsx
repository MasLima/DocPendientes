import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet } from '../api/client';
import CampoBusqueda from '../components/CampoBusqueda';

export default function NuevaIncidenciaScreen() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const clienteInicial = searchParams.get('cliente') || '';
  const nombreInicial = searchParams.get('nombre') || '';

  const [cliente, setCliente] = useState(clienteInicial);
  const [nombreCliente, setNombreCliente] = useState(nombreInicial);
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [accion, setAccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!busqueda.trim() || nombreCliente) return;
    let activo = true;
    const delay = setTimeout(async () => {
      try {
        const data = await apiGet(`/clientes?q=${encodeURIComponent(busqueda)}`, token);
        if (activo) setClientes(Array.isArray(data) ? data : data.value || []);
      } catch { /* noop */ }
    }, 350);
    return () => { activo = false; clearTimeout(delay); };
  }, [busqueda, nombreCliente, token]);

  const guardar = async (e) => {
    e.preventDefault();
    if (!cliente) {
      setError('Selecciona el cliente de la incidencia');
      return;
    }
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await apiPost('/incidencias', {
        ter_cote: cliente,
        inc_desc: descripcion.trim(),
        inc_acci: accion.trim()
      }, token);
      navigate(-1);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>← Volver</button>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Nueva incidencia</h2>

      <form onSubmit={guardar}>
        <div style={{ marginBottom: 14 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Cliente (obligatorio)</label>
          {nombreCliente ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(26,43,76,0.06)' }}>
              <strong>{nombreCliente} ({cliente})</strong>
              {!clienteInicial && (
                <button type="button" className="btn btn-ghost" onClick={() => { setCliente(''); setNombreCliente(''); }}>Cambiar</button>
              )}
            </div>
          ) : (
            <>
              <CampoBusqueda
                width="100%"
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar cliente por nombre o código..."
              />
              {clientes.length > 0 && (
                <div className="card" style={{ marginTop: 6, maxHeight: 220, overflowY: 'auto', padding: 6 }}>
                  {clientes.map((c) => (
                    <button
                      key={c.ter_cote}
                      type="button"
                      className="btn btn-ghost"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--borde)' }}
                      onMouseDown={() => { setCliente(c.ter_cote); setNombreCliente(c.ter_deno); setClientes([]); }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.ter_deno || 'Sin nombre'}</div>
                      <div className="mutado">{c.ter_cote}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Descripción de la visita *</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Describe lo encontrado en la visita..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ minHeight: 90 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Acción / gestión realizada</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Compromiso, promesa de pago, observaciones..."
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>

        <div className="mutado" style={{ marginBottom: 14 }}>Vendedor: {user ? user.use_logi : '-'}</div>

        {error && (
          <div style={{ color: 'var(--rojo)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button className="btn btn-verde" type="submit" disabled={guardando} style={{ padding: 14, fontSize: 15 }}>
          {guardando ? 'Guardando...' : 'Guardar incidencia'}
        </button>
      </form>
    </div>
  );
}