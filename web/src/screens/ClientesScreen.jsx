import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import Exportar from '../components/Exportar';
import { EyeIcon, DocumentIcon, CalendarIcon, TimeIcon, StatsIcon, SettingsIcon, CheckIcon, CloseIcon, WhatsAppIcon } from '../components/Iconos';
import CampoBusqueda from '../components/CampoBusqueda';
import FiltroVendedores from '../components/FiltroVendedores';

const POR_PAGINA = 100;

function fmt(v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtFecha(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function sumarDias(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function hoyISO() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function ClientesScreen() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [resumenData, setResumenData] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [vendedoresSel, setVendedoresSel] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [anchoCliente, setAnchoCliente] = useState(280);
  const [pestana, setPestana] = useState('pendientes');

  // Parametros de rangos (igual que el detalle por cliente)
  const [fechaInicial, setFechaInicial] = useState(hoyISO());
  const [diasRango, setDiasRango] = useState(30);
  const [cantRangos, setCantRangos] = useState(4);
  const [diasRangoAnti, setDiasRangoAnti] = useState(30);
  const [cantRangosAnti, setCantRangosAnti] = useState(4);
  const [tipoRangoAnti, setTipoRangoAnti] = useState('mensual'); // semanal|quincenal|mensual|otro

  // Vencimientos
  const [vencimientos, setVencimientos] = useState(null);
  const [vencError, setVencError] = useState('');
  const [rangoExpandido, setRangoExpandido] = useState(null);
  const [docsSeleccionados, setDocsSeleccionados] = useState([]);
  const [modalEnvio, setModalEnvio] = useState(null); // { cliente, telefono, docs }
  const [modalConfig, setModalConfig] = useState(false);
  const [configRangos, setConfigRangos] = useState([]);
  const [editandoRango, setEditandoRango] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const seleccionarTipoRango = (tipo) => {
    setTipoRangoAnti(tipo);
    const dias = { semanal: 7, quincenal: 15, mensual: 30 }[tipo];
    if (dias) setDiasRangoAnti(dias);
  };

  // El vendedor ve solo su cartera: ocultamos columna y filtro de vendedor.
  const puedeTodos = user?.permisos?.includes('clientes.ver_todos') || false;

  const cargar = useCallback(async () => {
    try {
      const qs = vendedoresSel.length > 0 ? `?vendedor=${encodeURIComponent(vendedoresSel.join(','))}` : '';
      const data = await apiGet(`/clientes${qs}`, token);
      setClientes(Array.isArray(data) ? data : data.value || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, vendedoresSel]);

  const cargarResumen = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        fechaInicial,
        diasRango: String(diasRango),
        cantRangos: String(cantRangos),
        diasRangoAnti: String(diasRangoAnti),
        cantRangosAnti: String(cantRangosAnti)
      });
      if (vendedoresSel.length > 0) params.set('vendedor', vendedoresSel.join(','));
      const data = await apiGet(`/clientes/resumen?${params.toString()}`, token);
      setResumenData(data);
    } catch (err) {
      setError(err.message);
    }
  }, [token, vendedoresSel, fechaInicial, diasRango, cantRangos, diasRangoAnti, cantRangosAnti]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  // Cargar vencimientos
  const cargarVencimientos = useCallback(async () => {
    try {
      setVencError('');
      const params = new URLSearchParams();
      if (vendedoresSel.length > 0) params.set('vendedor', vendedoresSel.join(','));
      const data = await apiGet(`/clientes/vencimientos?${params.toString()}`, token);
      setVencimientos(data);
    } catch (err) {
      console.error('Error cargando vencimientos:', err);
      setVencError(err.message);
    }
  }, [token, vendedoresSel]);

  // Cargar config de rangos
  const cargarConfigRangos = useCallback(async () => {
    try {
      const data = await apiGet('/config/vencimientos', token);
      setConfigRangos(data);
    } catch (err) {
      console.error('Error cargando config:', err);
    }
  }, [token]);

  useEffect(() => { if (pestana === 'vencimientos') { cargarVencimientos(); cargarConfigRangos(); } }, [pestana, cargarVencimientos, cargarConfigRangos]);

  // Filtrado en memoria (rapido incluso con 14k filas gracias a useMemo).
  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return clientes;
    return clientes.filter((c) =>
      (c.ter_deno || '').toLowerCase().includes(b) ||
      (c.ter_rucn || '').includes(b) ||
      (c.ter_cote || '').includes(b)
    );
  }, [clientes, busqueda]);

  // Filtrado en memoria para cronograma/antiguedad (por cliente).
  const filtrarResumen = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    const filtra = (filas) => {
      if (!b) return filas;
      return filas.filter((r) =>
        (r.ter_deno || '').toLowerCase().includes(b) || (r.ter_cote || '').includes(b)
      );
    };
    return {
      cronograma: resumenData ? filtra(resumenData.cronograma || []) : [],
      antiguedad: resumenData ? filtra(resumenData.antiguedad || []) : []
    };
  }, [resumenData, busqueda]);

  // Paginacion: solo se pintan POR_PAGINA filas, la UI nunca se congela.
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA),
    [filtrados, paginaSegura]
  );

  // Volver a la pagina 1 al cambiar la busqueda o el vendedor.
  useEffect(() => { setPagina(1); }, [busqueda, vendedoresSel]);

  // Redimension de la columna Cliente arrastrando el borde del encabezado.
  const empezarResize = (e) => {
    e.preventDefault();
    const inicioX = e.clientX;
    const inicioW = anchoCliente;
    const mover = (ev) => {
      const w = Math.min(600, Math.max(120, inicioW + (ev.clientX - inicioX)));
      setAnchoCliente(w);
    };
    const soltar = () => {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  };

  // Columnas y filas para exportar en cada pestana
  const colSaldoExportar = ['Código', 'Cliente', 'RUC', 'Saldo S/.', 'Saldo US$', ...(puedeTodos ? ['Vendedor'] : [])];
  const filasSaldoExportar = filtrados.map((c) => [
    c.ter_cote, c.ter_deno || '', c.ter_rucn || '-',
    `S/. ${fmt(c.saldo_pen)}`, c.saldo_usd ? `US$ ${fmt(c.saldo_usd)}` : 'S/. 0.00',
    ...(puedeTodos ? [c.vendedor_nombre || c.ter_core || '-'] : [])
  ]);

  // Rangos cronograma (labels)
  const rangosCrono = (() => {
    const ini = new Date(`${fechaInicial}T00:00:00`);
    const arr = ['Vencidos'];
    for (let i = 0; i < cantRangos; i++) {
      const dIni = sumarDias(ini, i * diasRango);
      const dFin = sumarDias(ini, i * diasRango + diasRango - 1);
      arr.push(`${fmtFecha(dIni)} - ${fmtFecha(dFin)}`);
    }
    arr.push(`Mayor a ${fmtFecha(sumarDias(ini, cantRangos * diasRango))}`);
    return arr;
  })();
  const colCronograma = ['Código', 'Cliente', 'Saldo S/.', ...rangosCrono];
  const filasCronograma = filtrarResumen.cronograma.map((r) => {
    const vals = [];
    for (let i = 0; i < rangosCrono.length; i++) vals.push(fmt(r[`r${i}`] || 0));
    return [r.ter_cote, r.ter_deno || '', `S/. ${fmt(r.saldo_total)}`, ...vals];
  });

  // Rangos antiguedad (labels)
  const rangosAnti = ['Al día'];
  for (let i = 0; i < cantRangosAnti; i++) {
    const min = i * diasRangoAnti + 1;
    const max = (i + 1) * diasRangoAnti;
    rangosAnti.push(`${min} - ${max} días`);
  }
  rangosAnti.push(`Mayores a ${cantRangosAnti * diasRangoAnti} días`);
  const colAntiguedad = ['Código', 'Cliente', 'Saldo S/.', ...rangosAnti];
  const filasAntiguedad = filtrarResumen.antiguedad.map((r) => {
    const vals = [];
    for (let i = 0; i < rangosAnti.length; i++) vals.push(fmt(r[`r${i}`] || 0));
    return [r.ter_cote, r.ter_deno || '', `S/. ${fmt(r.saldo_total)}`, ...vals];
  });

  // Totales por columna para las pestanas de cronograma y antiguedad.
  const totalesColumna = (filas, nRangos) => {
    const t = { saldo: 0, r: [] };
    for (let i = 0; i <= nRangos + 1; i++) t.r.push(0);
    filas.forEach((r) => {
      t.saldo += Number(r.saldo_total || 0);
      for (let i = 0; i <= nRangos + 1; i++) t.r[i] += Number(r[`r${i}`] || 0);
    });
    return t;
  };
  const totCronograma = totalesColumna(filtrarResumen.cronograma, cantRangos);
  const totAntiguedad = totalesColumna(filtrarResumen.antiguedad, cantRangosAnti);

  // Resumen de todas las pestanas en una (totales)
  const totales = resumenData?.totales || {};
  const porCondicion = resumenData?.porCondicion || [];
  const porEstado = resumenData?.porEstado || [];

  const tabBtn = (clave, icono, label) => (
    <button
      className="btn btn-ghost"
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: pestana === clave ? 'var(--active)' : 'var(--tarjeta)', color: pestana === clave ? 'var(--texto)' : 'var(--texto)', border: '1px solid var(--borde)', height: 40 }}
      onClick={() => setPestana(clave)}
    >
      {icono} {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          Clientes <span className="mutado">({filtrados.length})</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {filtrados.length > 0 && pestana === 'pendientes' && (
            <Exportar nombreArchivo="clientes" columnas={colSaldoExportar} filas={filasSaldoExportar} />
          )}
          {pestana === 'cronograma' && filtrarResumen.cronograma.length > 0 && (
            <Exportar nombreArchivo="clientes_cronograma" columnas={colCronograma} filas={filasCronograma} />
          )}
          {pestana === 'antiguedad' && filtrarResumen.antiguedad.length > 0 && (
            <Exportar nombreArchivo="clientes_antiguedad" columnas={colAntiguedad} filas={filasAntiguedad} />
          )}
          {puedeTodos && (
            <FiltroVendedores token={token} seleccionados={vendedoresSel} onCambio={setVendedoresSel} />
          )}
          <CampoBusqueda
            width={300}
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre, RUC o código..."
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14, background: 'rgba(26,43,76,0.04)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', marginBottom: 6 }}>Resumen general</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
          <div className="mutado">Clientes con deuda: <strong style={{ color: 'var(--texto)' }}>{totales.total_clientes || 0}</strong></div>
          <div className="mutado">Documentos pendientes: <strong style={{ color: 'var(--texto)' }}>{totales.total_documentos || 0}</strong></div>
          <div className="mutado">Saldo S/. <strong style={{ color: 'var(--verde)' }}>{fmt(totales.saldo_pen)}</strong></div>
          {totales.saldo_usd ? <div className="mutado">Saldo US$ <strong style={{ color: 'var(--verde)' }}>{fmt(totales.saldo_usd)}</strong></div> : null}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabBtn('pendientes', <DocumentIcon size={18} />, 'Documentos Pendientes')}
        {tabBtn('cronograma', <CalendarIcon size={18} />, 'Cronograma de Vencimientos')}
        {tabBtn('antiguedad', <TimeIcon size={18} />, 'Antigüedad de la Deuda')}
        {tabBtn('vencimientos', <WhatsAppIcon size={18} />, 'Vencimientos')}
        {tabBtn('resumen', <StatsIcon size={18} />, 'Resumen')}
      </div>

      {cargando ? (
        <div className="vacio">Cargando clientes...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : (
        <>
          {pestana === 'pendientes' && (
            <>
              <table className="tabla" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Código</th>
                    <th style={{ width: anchoCliente, position: 'relative' }}>
                      Cliente
                      <span
                        onMouseDown={empezarResize}
                        title="Arrastrar para ajustar ancho"
                        style={{ position: 'absolute', top: 0, right: -4, width: 8, height: '100%', cursor: 'col-resize' }}
                      />
                    </th>
                    <th style={{ width: 110 }}>RUC</th>
                    <th style={{ width: 130 }}>Saldo</th>
                    {puedeTodos && <th style={{ width: 150 }}>Vendedor</th>}
                    <th style={{ width: 150 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((c) => (
                    <tr key={c.ter_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${c.ter_cote}`)}>
                      <td className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ter_cote}</td>
                      <td
                        title={c.ter_deno || 'Sin nombre'}
                        style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {c.ter_deno || 'Sin nombre'}
                      </td>
                      <td className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ter_rucn || '-'}</td>
                      <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        S/. {fmt(c.saldo_pen)}{c.saldo_usd ? ` | US$ ${fmt(c.saldo_usd)}` : ''}
                      </td>
                      {puedeTodos && <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.vendedor_nombre || c.ter_core || '-'}</td>}
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--verde)', background: 'transparent', fontWeight: 700 }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.ter_cote}/incidencias`); }}
                        >
                          <EyeIcon size={14} /> Ver incidencias
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtrados.length === 0 && <div className="vacio">Sin resultados</div>}

              {totalPaginas > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
                  <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaSegura <= 1} onClick={() => setPagina(paginaSegura - 1)}>
                    ← Anterior
                  </button>
                  <span className="mutado">
                    Página {paginaSegura} de {totalPaginas} · mostrando {visibles.length} de {filtrados.length}
                  </span>
                  <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(paginaSegura + 1)}>
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}

          {pestana === 'cronograma' && (
            <div>
              <div className="card" style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <div>
                  <div className="mutado" style={{ marginBottom: 8 }}>Cronograma de vencimientos por cliente</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <label className="mutado">
                      Cantidad de Rangos{' '}
                      <input className="input" type="number" min="1" max="30" style={{ width: 90 }} value={cantRangos}
                        onChange={(e) => setCantRangos(Math.max(1, Number(e.target.value) || 1))} />
                    </label>
                    <label className="mutado">
                      Días por Rango{' '}
                      <input className="input" type="number" min="1" max="365" style={{ width: 90 }} value={diasRango}
                        onChange={(e) => setDiasRango(Math.max(1, Number(e.target.value) || 1))} />
                    </label>
                    <label className="mutado">
                      Fecha Inicial{' '}
                      <input className="input" type="date" style={{ width: 150 }} value={fechaInicial}
                        onChange={(e) => setFechaInicial(e.target.value)} />
                    </label>
                  </div>
                </div>
                {filtrarResumen.cronograma.length > 0 && (
                  <div className="card" style={{ margin: 0, padding: '8px 12px', background: 'var(--fondo)' }}>
                    <div className="mutado" style={{ fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', fontSize: 11 }}>Totales por columna</div>
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th className="mono">Saldo</th>
                          {rangosCrono.map((r, i) => <th key={i} className="mono">{r}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(totCronograma.saldo)}</td>
                          {totCronograma.r.map((v, i) => (
                            <td key={i} className="mono" style={{ fontWeight: 700, color: i === 0 ? 'var(--rojo)' : 'var(--texto)' }}>{fmt(v)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {filtrarResumen.cronograma.length === 0 ? (
                <div className="vacio">Sin resultados</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tabla">
                    <thead>
                      <tr>{colCronograma.map((c, i) => <th key={i} className="mono">{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtrarResumen.cronograma.map((r) => (
                        <tr key={r.ter_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${r.ter_cote}`)}>
                          <td className="mono">{r.ter_cote}</td>
                          <td style={{ fontWeight: 600 }}>{r.ter_deno || 'Sin nombre'}</td>
                          <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.saldo_total)}</td>
                          <td className="mono" style={{ color: 'var(--rojo)', fontWeight: 700 }}>{fmt(r.r0 || 0)}</td>
                          {Array.from({ length: cantRangos }, (_, i) => (
                            <td key={i} className="mono">{fmt(r[`r${i + 1}`] || 0)}</td>
                          ))}
                          <td className="mono" style={{ fontWeight: 700 }}>{fmt(r[`r${cantRangos + 1}`] || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {pestana === 'antiguedad' && (
            <div>
              <div className="card" style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <div>
                  <div className="mutado" style={{ marginBottom: 8 }}>Antigüedad de la deuda por cliente</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <span className="mutado">Rango por:</span>
                    {[
                      { clave: 'semanal', texto: 'Semanal' },
                      { clave: 'quincenal', texto: 'Quincenal' },
                      { clave: 'mensual', texto: 'Mensual' },
                      { clave: 'otro', texto: 'Otro' }
                    ].map((o) => (
                      <button
                        key={o.clave}
                        className="btn btn-ghost"
                        style={{ border: '1px solid var(--borde)', background: tipoRangoAnti === o.clave ? 'var(--primario)' : 'var(--tarjeta)', color: tipoRangoAnti === o.clave ? '#fff' : 'var(--texto)' }}
                        onClick={() => seleccionarTipoRango(o.clave)}
                      >
                        {o.texto}
                      </button>
                    ))}
                    {tipoRangoAnti === 'otro' && (
                      <label className="mutado">
                        Días por Rango{' '}
                        <input className="input" type="number" min="1" max="365" style={{ width: 90 }} value={diasRangoAnti}
                          onChange={(e) => setDiasRangoAnti(Math.max(1, Number(e.target.value) || 1))} />
                      </label>
                    )}
                    <label className="mutado">
                      Cantidad de Rangos{' '}
                      <input className="input" type="number" min="1" max="30" style={{ width: 90 }} value={cantRangosAnti}
                        onChange={(e) => setCantRangosAnti(Math.max(1, Number(e.target.value) || 1))} />
                    </label>
                  </div>
                </div>
                {filtrarResumen.antiguedad.length > 0 && (
                  <div className="card" style={{ margin: 0, padding: '8px 12px', background: 'var(--fondo)' }}>
                    <div className="mutado" style={{ fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', fontSize: 11 }}>Totales por columna</div>
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th className="mono">Saldo</th>
                          {rangosAnti.map((r, i) => <th key={i} className="mono">{r}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(totAntiguedad.saldo)}</td>
                          {totAntiguedad.r.map((v, i) => (
                            <td key={i} className="mono" style={{ fontWeight: 700, color: i === 0 ? 'var(--verde)' : 'var(--texto)' }}>{fmt(v)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {filtrarResumen.antiguedad.length === 0 ? (
                <div className="vacio">Sin resultados</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tabla">
                    <thead>
                      <tr>{colAntiguedad.map((c, i) => <th key={i} className="mono">{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtrarResumen.antiguedad.map((r) => (
                        <tr key={r.ter_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${r.ter_cote}`)}>
                          <td className="mono">{r.ter_cote}</td>
                          <td style={{ fontWeight: 600 }}>{r.ter_deno || 'Sin nombre'}</td>
                          <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.saldo_total)}</td>
                          <td className="mono" style={{ color: 'var(--verde)' }}>{fmt(r.r0 || 0)}</td>
                          {Array.from({ length: cantRangosAnti }, (_, i) => (
                            <td key={i} className="mono">{fmt(r[`r${i + 1}`] || 0)}</td>
                          ))}
                          <td className="mono" style={{ fontWeight: 700 }}>{fmt(r[`r${cantRangosAnti + 1}`] || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {pestana === 'resumen' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)' }}>Totales por condición de pago</div>
                    {porCondicion.length > 0 && (
                      <Exportar nombreArchivo="clientes_resumen_condicion" columnas={['Condición', 'Docs', 'Saldo']} filas={porCondicion.map((r) => [r.condicion, r.total_documentos, `S/. ${fmt(r.total_saldo)}`])} />
                    )}
                  </div>
                  <table className="tabla">
                    <thead><tr><th>Condición</th><th>Docs</th><th>Saldo</th></tr></thead>
                    <tbody>
                      {porCondicion.map((r) => (
                        <tr key={r.condicion}><td>{r.condicion}</td><td className="mono">{r.total_documentos}</td><td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.total_saldo)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)' }}>Totales por estado</div>
                    {porEstado.length > 0 && (
                      <Exportar nombreArchivo="clientes_resumen_estado" columnas={['Estado', 'Docs', 'Saldo']} filas={porEstado.map((r) => [r.estado, r.total_documentos, `S/. ${fmt(r.total_saldo)}`])} />
                    )}
                  </div>
                  <table className="tabla">
                    <thead><tr><th>Estado</th><th>Docs</th><th>Saldo</th></tr></thead>
                    <tbody>
                      {porEstado.map((r) => (
                        <tr key={r.estado}><td>{r.estado}</td><td className="mono">{r.total_documentos}</td><td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.total_saldo)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {pestana === 'vencimientos' && (
            <div>
              <VencimientosTab
                vencimientos={vencimientos}
                vencError={vencError}
                rangoExpandido={rangoExpandido}
                setRangoExpandido={setRangoExpandido}
                docsSeleccionados={docsSeleccionados}
                setDocsSeleccionados={setDocsSeleccionados}
                onEnviarWhatsApp={(cliente, docs) => setModalEnvio({ cliente, docs })}
                cargando={!vencimientos && !vencError}
                configRangos={configRangos}
                setModalConfig={setModalConfig}
                setEditandoRango={setEditandoRango}
              />
            </div>
          )}
        </>
      )}

      {modalEnvio && (
        <ModalEnvioVencimiento
          cliente={modalEnvio.cliente}
          documentos={modalEnvio.docs}
          rango={rangoExpandido}
          onClose={() => setModalEnvio(null)}
          onEnviado={() => { setModalEnvio(null); setDocsSeleccionados([]); cargarVencimientos(); }}
          token={token}
          enviando={enviando}
          setEnviando={setEnviando}
        />
      )}

      {modalConfig && (
        <ModalConfigVencimientos
          rangos={configRangos}
          editandoRango={editandoRango}
          setEditandoRango={setEditandoRango}
          onClose={() => { setModalConfig(false); setEditandoRango(null); cargarConfigRangos(); }}
          token={token}
        />
      )}
    </div>
  );
}

// ===================== VencimientosTab =====================
function VencimientosTab({ vencimientos, vencError, rangoExpandido, setRangoExpandido, docsSeleccionados, setDocsSeleccionados, onEnviarWhatsApp, cargando, configRangos, setModalConfig, setEditandoRango }) {
  const { token } = useAuth();

  if (cargando) return <div className="vacio">Cargando vencimientos...</div>;
  if (vencError) return <div className="vacio" style={{ color: 'var(--rojo)' }}>Error: {vencError}</div>;
  if (!vencimientos || !vencimientos.rangos) return <div className="vacio">Sin datos de vencimientos</div>;

  const { rangos, total } = vencimientos;
  const rangoKeys = Object.keys(rangos);

  const toggleRango = (nombre) => {
    setRangoExpandido(rangoExpandido === nombre ? null : nombre);
    setDocsSeleccionados([]);
  };

  const toggleDoc = (key) => {
    setDocsSeleccionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const seleccionarTodos = (nombre) => {
    const docs = rangos[nombre]?.documentos || [];
    const keys = docs.map(d => `${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`);
    const todosMarcados = keys.every(k => docsSeleccionados.includes(k));
    setDocsSeleccionados(todosMarcados ? docsSeleccionados.filter(k => !keys.includes(k)) : [...docsSeleccionados, ...keys.filter(k => !docsSeleccionados.includes(k))]);
  };

  const agruparPorCliente = (docs) => {
    const map = {};
    docs.forEach(d => {
      if (!map[d.ter_cote]) map[d.ter_cote] = { nombre: d.cliente_nombre, telefono: d.ter_cell || d.ter_fono || '', documentos: [] };
      map[d.ter_cote].documentos.push(d);
    });
    return Object.entries(map);
  };

  const seleccionadosDelRango = rangoExpandido
    ? (rangos[rangoExpandido]?.documentos || []).filter(d => docsSeleccionados.includes(`${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`))
    : [];

  const clientesSeleccionados = seleccionadosDelRango.reduce((acc, d) => {
    if (!acc[d.ter_cote]) acc[d.ter_cote] = { nombre: d.cliente_nombre, telefono: d.ter_cell || d.ter_fono || '', documentos: [] };
    acc[d.ter_cote].documentos.push(d);
    return acc;
  }, {});

  const colorPorRango = (desde, hasta) => {
    if (hasta < 0) return 'var(--celeste)';
    if (desde === 0) return 'var(--warning)';
    return 'var(--rojo)';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="mutado">
          Total: {total.cantidad} documentos · S/ {fmt(total.saldo_pen)}
        </div>
        <button
          className="btn btn-ghost"
          style={{ border: '1px solid var(--borde)', display: 'flex', alignItems: 'center', gap: 6, height: 36 }}
          onClick={() => setModalConfig(true)}
        >
          <SettingsIcon size={16} /> Configurar rangos
        </button>
      </div>

      {rangoKeys.length === 0 && <div className="vacio">No hay rangos de vencimiento configurados</div>}

      {rangoKeys.map(nombre => {
        const r = rangos[nombre];
        const expandido = rangoExpandido === nombre;
        const docs = r.documentos || [];
        const enviadosCount = docs.filter(d => d.enviado).length;

        return (
          <div key={nombre} style={{ marginBottom: 10 }}>
            <div
              onClick={() => toggleRango(nombre)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                background: expandido ? 'var(--active)' : 'var(--tarjeta)',
                border: `1px solid ${expandido ? colorPorRango(r.dias_desde, r.dias_hasta) : 'var(--borde)'}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorPorRango(r.dias_desde, r.dias_hasta) }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.etiqueta}</div>
                  <div className="mutado" style={{ fontSize: 12 }}>
                    {r.dias_desde === r.dias_hasta
                      ? `Día ${r.dias_desde}`
                      : `${r.dias_desde} a ${r.dias_hasta} días`
                    }
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{r.cantidad}</div>
                  <div className="mutado" style={{ fontSize: 12 }}>S/ {fmt(r.saldo_pen)}</div>
                </div>
                {enviadosCount > 0 && (
                  <span style={{ background: '#d5f5e3', color: '#1e8449', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    ✓ {enviadosCount} enviados
                  </span>
                )}
                <span style={{ fontSize: 18, color: 'var(--mutado)', transition: 'transform 0.2s', transform: expandido ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
              </div>
            </div>

            {expandido && docs.length > 0 && (
              <div style={{ marginTop: 4, border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--fondo)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={docs.every(d => docsSeleccionados.includes(`${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`))}
                      onChange={() => seleccionarTodos(nombre)}
                    />
                    Seleccionar todos ({docs.length})
                  </label>
                  {docsSeleccionados.length > 0 && (
                    <button
                      className="btn"
                      style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, height: 34, fontSize: 13 }}
                      onClick={() => {
                        const clientes = {};
                        seleccionadosDelRango.forEach(d => {
                          if (!clientes[d.ter_cote]) clientes[d.ter_cote] = { nombre: d.cliente_nombre, telefono: d.ter_cell || d.ter_fono || '', documentos: [] };
                          clientes[d.ter_cote].documentos.push(d);
                        });
                        Object.entries(clientes).forEach(([terCote, info]) => {
                          onEnviarWhatsApp({ ter_cote: terCote, ...info }, info.documentos);
                        });
                      }}
                    >
                      Enviar WhatsApp ({docsSeleccionados.length} docs, {Object.keys(clientesSeleccionados).length} clientes)
                    </button>
                  )}
                </div>

                <table className="tabla">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th>Documento</th>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                      <th>Vence</th>
                      <th>Días</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(d => {
                      const key = `${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`;
                      const marcado = docsSeleccionados.includes(key);
                      return (
                        <tr key={key} style={{ opacity: d.enviado ? 0.5 : 1, background: marcado ? 'var(--active)' : undefined }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={d.enviado}
                              onChange={() => toggleDoc(key)}
                            />
                          </td>
                          <td className="mono" style={{ fontWeight: 600 }}>{d.cob_codo}-{d.cob_seri}-{d.cob_nums}</td>
                          <td style={{ fontWeight: 600 }}>{d.cliente_nombre}</td>
                          <td className="mono">{d.ter_cell || d.ter_fono || '-'}</td>
                          <td className="mono">{d.fecha_vencimiento ? fmtFecha(new Date(d.fecha_vencimiento)) : '-'}</td>
                          <td className="mono">{d.dias_vencido}</td>
                          <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/ {fmt(d.saldo)}</td>
                          <td>
                            {d.enviado
                              ? <span style={{ color: '#1e8449', fontWeight: 700, fontSize: 12 }}>✓ Enviado</span>
                              : <span style={{ color: 'var(--mutado)', fontSize: 12 }}>Pendiente</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {expandido && docs.length === 0 && (
              <div className="vacio" style={{ marginTop: 8 }}>No hay documentos en este rango</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===================== ModalEnvioVencimiento =====================
function ModalEnvioVencimiento({ cliente, documentos, rango, onClose, onEnviado, token, enviando, setEnviando }) {
  const [telefono, setTelefono] = useState(cliente.telefono || '');
  const [enviados, setEnviados] = useState(null);

  const total = documentos.reduce((s, d) => s + Number(d.saldo), 0);

  const mensajePreview = useMemo(() => {
    const docLineas = documentos.map(d => {
      const fecha = d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-PE') : '-';
      const dias = Math.abs(d.dias_vencido);
      return `• ${d.cob_codo}-${d.cob_seri}-${d.cob_nums} | Vence: ${fecha} | ${dias} días | S/ ${Number(d.saldo).toFixed(2)}`;
    }).join('\n');

    let msg = `Estimado *${cliente.nombre}*, le informamos que los siguientes documentos se encuentran pendientes:\n\n${docLineas}\n\n*Total pendiente: S/ ${total.toFixed(2)}*\n\nLe solicitamos regularizar su pago a la brevedad.`;
    return msg;
  }, [cliente, documentos, total]);

  const enviar = async () => {
    setEnviando(true);
    try {
      const payload = documentos.map(d => ({
        ter_cote: cliente.ter_cote || cliente.ter_cote,
        cliente_nombre: cliente.nombre,
        cob_tivo: d.cob_tivo,
        cob_nuvo: d.cob_nuvo,
        cob_codo: d.cob_codo,
        cob_seri: d.cob_seri,
        cob_nums: d.cob_nums,
        saldo: d.saldo,
        fecha_vencimiento: d.fecha_vencimiento,
        dias_vencido: d.dias_vencido,
        ter_cell: cliente.telefono
      }));

      const result = await apiPost('/whatsapp/enviar-vencimiento', {
        documentos: payload,
        rango,
        telefono
      }, token);

      setEnviados(result.resultados);
      setTimeout(() => onEnviado(), 2000);
    } catch (err) {
      setEnviados([{ ok: false, error: err.message }]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Enviar recordatorio WhatsApp</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><CloseIcon size={18} /></button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Cliente</label>
          <div style={{ fontWeight: 700 }}>{cliente.nombre}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Teléfono</label>
          <input
            className="input"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 51923287233"
          />
          <div className="mutado" style={{ fontSize: 11, marginTop: 2 }}>Formato: código país + número. Ej: 51923287233</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Documentos ({documentos.length}) · Total: S/ {fmt(total)}</label>
        </div>

        <div style={{ background: 'var(--fondo)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 200, overflow: 'auto' }}>
          {mensajePreview}
        </div>

        {enviados ? (
          <div>
            {enviados.map((r, i) => (
              <div key={i} style={{ padding: '4px 0', fontSize: 13, color: r.ok ? '#1e8449' : 'var(--rojo)' }}>
                {r.ok ? `✓ ${r.enviados} documentos enviados` : `✗ ${r.error}`}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} onClick={onClose}>Cancelar</button>
            <button
              className="btn"
              style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={enviando || !telefono}
              onClick={enviar}
            >
              {enviando ? 'Enviando...' : 'Enviar WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== ModalConfigVencimientos =====================
function ModalConfigVencimientos({ rangos, editandoRango, setEditandoRango, onClose, token }) {
  const [form, setForm] = useState({ etiqueta: '', dias_desde: 0, dias_hasta: 0, mensaje_template: '', orden: 0 });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (editandoRango) {
      setForm({
        etiqueta: editandoRango.etiqueta || '',
        dias_desde: editandoRango.dias_desde || 0,
        dias_hasta: editandoRango.dias_hasta || 0,
        mensaje_template: editandoRango.mensaje_template || '',
        orden: editandoRango.orden || 0
      });
    }
  }, [editandoRango]);

  const guardar = async () => {
    setGuardando(true);
    try {
      if (editandoRango) {
        await apiPut(`/config/vencimientos/${editandoRango.id}`, form, token);
      } else {
        await apiPost('/config/vencimientos', form, token);
      }
      setEditandoRango(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (rango) => {
    try {
      await apiPut(`/config/vencimientos/${rango.id}`, { activo: rango.activo ? 0 : 1 }, token);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este rango?')) return;
    try {
      await apiDelete(`/config/vencimientos/${id}`, token);
      setEditandoRango(null);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: editandoRango ? 480 : 500, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{editandoRango ? 'Editar Rango' : 'Configuración de Rangos'}</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><CloseIcon size={18} /></button>
        </div>

        {editandoRango ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Etiqueta</label>
              <input className="input" value={form.etiqueta} onChange={(e) => setForm({ ...form, etiqueta: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <label className="mutado" style={{ flex: 1, fontSize: 12 }}>
                Días desde
                <input className="input" type="number" style={{ width: '100%', marginTop: 4 }} value={form.dias_desde} onChange={(e) => setForm({ ...form, dias_desde: Number(e.target.value) })} />
              </label>
              <label className="mutado" style={{ flex: 1, fontSize: 12 }}>
                Días hasta
                <input className="input" type="number" style={{ width: '100%', marginTop: 4 }} value={form.dias_hasta} onChange={(e) => setForm({ ...form, dias_hasta: Number(e.target.value) })} />
              </label>
              <label className="mutado" style={{ flex: 1, fontSize: 12 }}>
                Orden
                <input className="input" type="number" style={{ width: '100%', marginTop: 4 }} value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Mensaje WhatsApp</label>
              <textarea
                className="input"
                rows={4}
                style={{ resize: 'vertical' }}
                value={form.mensaje_template}
                onChange={(e) => setForm({ ...form, mensaje_template: e.target.value })}
              />
              <div className="mutado" style={{ fontSize: 11, marginTop: 2 }}>Variables: {'{nombre}'} {'{doc}'} {'{fecha}'} {'{dias}'} {'{saldo}'} {'{total}'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--rojo)', color: 'var(--rojo)' }} onClick={() => eliminar(editandoRango.id)}>Eliminar</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} onClick={() => setEditandoRango(null)}>Volver</button>
                <button className="btn" style={{ background: 'var(--celeste)', color: '#fff' }} disabled={guardando} onClick={guardar}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {rangos.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--borde)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.etiqueta}</div>
                  <div className="mutado" style={{ fontSize: 12 }}>
                    {r.dias_desde === r.dias_hasta ? `Día ${r.dias_desde}` : `${r.dias_desde} a ${r.dias_hasta} días`} · Orden: {r.orden}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={!!r.activo} onChange={() => toggleActivo(r)} />
                    {r.activo ? 'Activo' : 'Inactivo'}
                  </label>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--borde)' }} onClick={() => setEditandoRango(r)}>
                    Editar
                  </button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'var(--celeste)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setEditandoRango({ etiqueta: '', dias_desde: 0, dias_hasta: 0, mensaje_template: '', orden: rangos.length + 1 })}>
                + Nuevo rango
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}