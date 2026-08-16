import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

function estadoColor(inc_estc) {
  if (inc_estc === 1) return '#e67e22';
  if (inc_estc === 2) return '#2980b9';
  if (inc_estc === 3) return '#27ae60';
  return '#7f8c8d';
}
function estadoTexto(inc_estc) {
  if (inc_estc === 1) return 'Registrada';
  if (inc_estc === 2) return 'En proceso';
  if (inc_estc === 3) return 'Resuelta';
  return 'Desconocido';
}

export default function IncidenciasScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pestana, setPestana] = useState('historial');
  const [incidencias, setIncidencias] = useState([]);
  const [frecuencia, setFrecuencia] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [clienteSel, setClienteSel] = useState(null);

  // Filtro por cliente desde la URL (cliente=Codigo&nombre=Nombre)
  useEffect(() => {
    const c = searchParams.get('cliente');
    const n = searchParams.get('nombre');
    if (c) {
      setClienteSel({ ter_cote: c, ter_deno: n || c });
      if (!searchParams.get('desde') && !searchParams.get('hasta')) {
        const p = new URLSearchParams(searchParams);
        p.delete('nombre');
        setSearchParams(p, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const cargar = useCallback(async () => {
    const q = [];
    if (clienteSel) q.push(`cliente=${encodeURIComponent(clienteSel.ter_cote)}`);
    if (desde) q.push(`desde=${desde}`);
    if (hasta) q.push(`hasta=${hasta}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    try {
      const [data, freq] = await Promise.all([
        apiGet(`/incidencias${qs}`, token),
        apiGet('/incidencias/frecuencia', token)
      ]);
      setIncidencias(Array.isArray(data) ? data : data.value || []);
      setFrecuencia(Array.isArray(freq) ? freq : freq.value || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, clienteSel, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    setClienteSel(null);
    setSearchParams({}, { replace: true });
  };

  const hayFiltros = desde || hasta || clienteSel;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Incidencias</h2>
        <button className="btn btn-verde" onClick={() => navigate('/incidencias/nueva')}>+ Registrar incidencia</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className="btn btn-ghost"
          style={{ background: pestana === 'historial' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'historial' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('historial')}
        >
          Historial
        </button>
        <button
          className="btn btn-ghost"
          style={{ background: pestana === 'frecuencia' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'frecuencia' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('frecuencia')}
        >
          Frecuencia
        </button>
      </div>

      {pestana === 'historial' && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="mutado" style={{ marginBottom: 8 }}>Filtros</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <label className="mutado">
              Desde <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 150 }} />
            </label>
            <label className="mutado">
              Hasta <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 150 }} />
            </label>
            {clienteSel ? (
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} onClick={() => { setClienteSel(null); setSearchParams({ desde, hasta }, { replace: true }); }}>
                {clienteSel.ter_deno} ({clienteSel.ter_cote}) ✕
              </button>
            ) : (
              <SelectCliente token={token} onSelect={(c) => setClienteSel(c)} />
            )}
            {hayFiltros && (
              <button className="btn btn-rojo" style={{ padding: '8px 12px', fontSize: 12 }} onClick={limpiarFiltros}>Limpiar</button>
            )}
          </div>
        </div>
      )}

      {cargando ? (
        <div className="vacio">Cargando...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : pestana === 'historial' ? (
        <table className="tabla">
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Vendedor</th><th>Descripción</th><th>Fecha</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {incidencias.map((it) => (
              <tr key={it.inc_codi}>
                <td className="mono">#{it.inc_codi}</td>
                <td style={{ fontWeight: 600 }}>{it.cliente_nombre || it.ter_cote || 'Sin cliente'}</td>
                <td>{it.vendedor_nombre || '-'}</td>
                <td style={{ maxWidth: 320 }}>{it.inc_desc}</td>
                <td className="mono">{it.fe_regi}</td>
                <td><span className="badge" style={{ backgroundColor: estadoColor(it.inc_estc) }}>{estadoTexto(it.inc_estc)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Vendedor</th><th>Visitas</th><th>Última</th><th>Días</th><th>Frecuencia</th><th>Última incidencia</th></tr>
          </thead>
          <tbody>
            {frecuencia.map((f) => (
              <tr key={f.ter_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/incidencias/${f.ter_cote}`)}>
                <td style={{ fontWeight: 600 }}>{f.cliente_nombre || f.ter_cote}</td>
                <td>{f.vendedor_nombre || '-'}</td>
                <td className="mono">{f.total_visitas}</td>
                <td className="mono">{f.ultima_visita || '-'}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{f.dias_desde_ultima === 0 ? 'hoy' : `${f.dias_desde_ultima} d`}</td>
                <td className="mono">{f.promedio_dias_entre_visitas ? `cada ~${f.promedio_dias_entre_visitas} d` : '-'}</td>
                <td style={{ maxWidth: 320 }}>{f.ultima_desc || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Selector de cliente con búsqueda en vivo contra /clientes?q=
function SelectCliente({ token, onSelect }) {
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!busqueda.trim() || !abierto) return;
    let activo = true;
    const delay = setTimeout(async () => {
      try {
        const data = await apiGet(`/clientes?q=${encodeURIComponent(busqueda)}`, token);
        if (activo) setClientes(Array.isArray(data) ? data : data.value || []);
      } catch { /* noop */ }
    }, 350);
    return () => { activo = false; clearTimeout(delay); };
  }, [busqueda, abierto, token]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        style={{ width: 240 }}
        placeholder="Filtrar por cliente..."
        value={busqueda}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 200)}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {abierto && clientes.length > 0 && (
        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, maxHeight: 240, overflowY: 'auto', padding: 6 }}>
          {clientes.map((c) => (
            <button
              key={c.ter_cote}
              className="btn btn-ghost"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--borde)' }}
              onMouseDown={() => { onSelect({ ter_cote: c.ter_cote, ter_deno: c.ter_deno }); setBusqueda(''); setClientes([]); setAbierto(false); }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.ter_deno || 'Sin nombre'}</div>
              <div className="mutado">{c.ter_cote}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}