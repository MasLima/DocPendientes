import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import Exportar from '../components/Exportar';
import CampoBusqueda from '../components/CampoBusqueda';
import { PlusIcon, FilterIcon, CheckIcon, CloseIcon, PeopleIcon } from '../components/Iconos';

function estadoColor(inc_estc) {
  if (inc_estc === 1) return '#f5b041';
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

const POR_PAGINA_INC = 20;

function FiltroIncidencias({ token, filtros, setFiltros, onAplicar, onLimpiar, children }) {
  const [abierto, setAbierto] = useState(false);
  const [temp, setTemp] = useState(filtros);
  const ref = useRef(null);

  useEffect(() => {
    const manejarClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  useEffect(() => { setTemp(filtros); }, [filtros]);

  const abrir = () => { setTemp(filtros); setAbierto(true); };
  const aplicar = () => { setFiltros(temp); onAplicar(temp); setAbierto(false); };
  const cancelar = () => { setAbierto(false); };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => abierto ? setAbierto(false) : abrir()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 6, border: `1px solid ${abierto ? 'var(--azul)' : 'var(--borde)'}`, background: abierto ? '#2980b915' : 'var(--fondo)', color: 'var(--texto)', cursor: 'pointer' }}>
        <FilterIcon size={16} /> Filtros
      </button>

      {abierto && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, marginTop: 6, width: 420, padding: 14, background: 'var(--tarjeta)', border: '1px solid var(--borde)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha inicio</label>
              <input type="date" value={temp.desde} onChange={e => setTemp(f => ({ ...f, desde: e.target.value }))}
                style={{ fontSize: 13, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--borde)', width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha fin</label>
              <input type="date" value={temp.hasta} onChange={e => setTemp(f => ({ ...f, hasta: e.target.value }))}
                style={{ fontSize: 13, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--borde)', width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cliente</label>
            <SelectClienteSimple token={token} value={temp.cliente} onSelect={(c) => setTemp(f => ({ ...f, cliente: c }))} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Vendedor</label>
            <SelectVendedorSimple token={token} value={temp.vendedor} onSelect={(v) => setTemp(f => ({ ...f, vendedor: v }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--borde)', paddingTop: 10 }}>
            <button onClick={aplicar} style={{ flex: 1, padding: '8px 10px', fontSize: 13, borderRadius: 6, border: 'none', background: 'var(--azul)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckIcon size={16} /> Aplicar
            </button>
            <button onClick={cancelar} style={{ flex: 1, padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #f5c6cb', background: '#fde9ec', color: '#c0392b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CloseIcon size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectClienteSimple({ token, value, onSelect }) {
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const manejarClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  useEffect(() => {
    if (!busqueda.trim() || !abierto) return;
    let activo = true;
    const delay = setTimeout(async () => {
      try {
        const data = await apiGet(`/clientes?q=${encodeURIComponent(busqueda)}`, token);
        if (activo) setClientes(Array.isArray(data) ? data : []);
      } catch {}
    }, 350);
    return () => { activo = false; clearTimeout(delay); };
  }, [busqueda, abierto, token]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--fondo)', borderRadius: 4, border: '1px solid var(--borde)' }}>
          <span style={{ fontSize: 13, flex: 1 }}>{value.ter_deno} ({value.ter_cote})</span>
          <button onClick={() => onSelect(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rojo)', padding: 0 }}>×</button>
        </div>
      ) : (
        <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
          placeholder="Buscar cliente..." onFocus={() => setAbierto(true)}
          style={{ width: '100%', fontSize: 13, padding: '6px 10px', borderRadius: 4, border: '1px solid var(--borde)' }} />
      )}
      {abierto && !value && clientes.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, background: 'var(--tarjeta)', border: '1px solid var(--borde)', borderRadius: 6, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {clientes.map(c => (
            <div key={c.ter_cote} onClick={() => { onSelect(c); setBusqueda(''); setClientes([]); setAbierto(false); }}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--borde)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--fondo)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontWeight: 600 }}>{c.ter_deno}</div>
              <div style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{c.ter_cote}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectVendedorSimple({ token, value, onSelect }) {
  const [vendedores, setVendedores] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    apiGet('/clientes/vendedores', token).then(d => setVendedores(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token]);

  useEffect(() => {
    const manejarClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setAbierto(!abierto)}
        style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 13, borderRadius: 4, border: '1px solid var(--borde)', background: 'var(--fondo)', cursor: 'pointer' }}>
        {value ? value.ter_deno : 'Seleccionar vendedor...'}
      </button>
      {abierto && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, background: 'var(--tarjeta)', border: '1px solid var(--borde)', borderRadius: 6, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div onClick={() => { onSelect(null); setAbierto(false); }}
            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--borde)', color: 'var(--texto-suave)' }}>
            Todos
          </div>
          {vendedores.map(v => (
            <div key={v.ter_cote} onClick={() => { onSelect(v); setAbierto(false); }}
              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--borde)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--fondo)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {v.ter_deno}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  const [busqueda, setBusqueda] = useState('');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', cliente: null, vendedor: null });

  useEffect(() => {
    const c = searchParams.get('cliente');
    const n = searchParams.get('nombre');
    if (c) setFiltros(f => ({ ...f, cliente: { ter_cote: c, ter_deno: n || c } }));
  }, [searchParams]);

  const cargar = useCallback(async () => {
    const q = [];
    if (filtros.cliente) q.push(`cliente=${encodeURIComponent(filtros.cliente.ter_cote)}`);
    if (filtros.vendedor) q.push(`vendedor=${encodeURIComponent(filtros.vendedor.ter_cote)}`);
    if (filtros.desde) q.push(`desde=${filtros.desde}`);
    if (filtros.hasta) q.push(`hasta=${filtros.hasta}`);
    if (busqueda.trim()) q.push(`q=${encodeURIComponent(busqueda.trim())}`);
    const qs = q.length ? `?${q.join('&')}` : '';
    try {
      const [data, freq] = await Promise.all([
        apiGet(`/incidencias${qs}`, token),
        apiGet(`/incidencias/frecuencia${busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ''}`, token)
      ]);
      setIncidencias(Array.isArray(data) ? data : data.value || []);
      setFrecuencia(Array.isArray(freq) ? freq : freq.value || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, filtros, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const limpiarFiltros = () => {
    setFiltros({ desde: '', hasta: '', cliente: null, vendedor: null });
    setBusqueda('');
    setMostrarHistorial(false);
    setSearchParams({}, { replace: true });
  };

  const hayFiltros = filtros.desde || filtros.hasta || filtros.cliente || filtros.vendedor;

  const btnTab = (key, label) => (
    <button className="btn btn-ghost"
      style={{ background: pestana === key ? 'var(--active)' : 'var(--tarjeta)', color: pestana === key ? 'var(--texto)' : 'var(--texto)', border: '1px solid var(--borde)', height: 40 }}
      onClick={() => setPestana(key)}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Incidencias</h2>
        <button className="btn btn-accion" style={{ background: 'var(--celeste)', color: '#fff', height: 40 }} onClick={() => navigate('/incidencias/nueva')}>
          <PlusIcon size={20} /> Registrar incidencia
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {btnTab('historial', 'Historial')}
        {btnTab('frecuencia', 'Frecuencia')}
      </div>

      {/* Línea: buscador + filtros + Excel + PDF */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <CampoBusqueda width={280} value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre de cliente o vendedor..." />
        <FiltroIncidencias token={token} filtros={filtros} setFiltros={setFiltros} onAplicar={() => {}} onLimpiar={limpiarFiltros} />
        {hayFiltros && (
          <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)', padding: '8px 12px', fontSize: 12, height: 40 }} onClick={limpiarFiltros}>Limpiar</button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Exportar
            nombreArchivo="incidencias"
            columnas={['#', 'Cliente', 'Vendedor', 'Descripción', 'Fecha', 'Estado']}
            filas={incidencias.map((it) => [it.inc_codi, it.cliente_nombre || it.ter_cote || 'Sin cliente', it.vendedor_nombre || '-', it.inc_desc, it.fe_regi, estadoTexto(it.inc_estc)])}
          />
        </div>
      </div>

      {cargando ? (
        <div className="vacio">Cargando...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : pestana === 'historial' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: mostrarHistorial ? 400 : 700, color: !mostrarHistorial ? 'var(--primario)' : 'var(--texto-suave)', cursor: incidencias.length > POR_PAGINA_INC ? 'pointer' : 'default' }}
                onClick={() => { if (incidencias.length > POR_PAGINA_INC) setMostrarHistorial(false); }}>
                Últimas {Math.min(POR_PAGINA_INC, incidencias.length)}
              </span>
              {incidencias.length > POR_PAGINA_INC && (
                <span style={{ fontSize: 13, fontWeight: mostrarHistorial ? 700 : 400, color: mostrarHistorial ? 'var(--primario)' : 'var(--texto-suave)', cursor: 'pointer' }}
                  onClick={() => setMostrarHistorial(!mostrarHistorial)}>
                  Ver historial ({incidencias.length})
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
              {mostrarHistorial ? `Todas (${incidencias.length})` : `Mostrando ${Math.min(POR_PAGINA_INC, incidencias.length)}`}
            </div>
          </div>
          <table className="tabla">
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Vendedor</th><th>Descripción</th><th>Fecha</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {(mostrarHistorial ? incidencias : incidencias.slice(0, POR_PAGINA_INC)).map((it) => (
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
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
