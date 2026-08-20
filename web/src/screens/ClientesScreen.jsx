import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import Exportar from '../components/Exportar';
import { EyeIcon, DocumentIcon, CalendarIcon, TimeIcon, StatsIcon } from '../components/Iconos';
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
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: pestana === clave ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === clave ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
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
        </>
      )}
    </div>
  );
}