import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import { DocumentIcon, CalendarIcon, TimeIcon, StatsIcon } from '../components/Iconos';
import Exportar from '../components/Exportar';

function fmt(v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estadoTexto(inc_estc) {
  if (inc_estc === 1) return 'Registrada';
  if (inc_estc === 2) return 'En proceso';
  if (inc_estc === 3) return 'Resuelta';
  return 'Desconocido';
}

// ---------- Utilidades de fechas ----------
function parseFecha(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
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
function diasEntre(a, b) {
  return Math.round((a - b) / 86400000);
}
function hoyISO() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---------- Cronograma de vencimientos (por documento) ----------
// Para cada documento se ubica su monto en: Vencidos, un rango de
// vencimiento o Mayores al Fecha Final.
function calcularCronograma(documentos, cantRangos, diasRango, fechaInicialISO) {
  const ini = parseFecha(fechaInicialISO);
  const resultado = { rangos: [], filas: [] };

  if (!ini || cantRangos < 1 || diasRango < 1) return resultado;

  for (let i = 0; i < cantRangos; i++) {
    const dIni = sumarDias(ini, i * diasRango);
    const dFin = sumarDias(ini, i * diasRango + diasRango - 1);
    resultado.rangos.push({ dIni, dFin, label: `${fmtFecha(dIni)} - ${fmtFecha(dFin)}` });
  }
  const finUltimo = resultado.rangos[cantRangos - 1].dFin;

  for (const d of documentos) {
    const feve = parseFecha(d.fecha_vencimiento);
    const fila = { doc: d, vencidos: 0, rangos: [], mayores: 0 };
    if (!feve) {
      fila.sineFecha = true;
      resultado.filas.push(fila);
      continue;
    }
    const monto = Number(d.saldo || 0);

    if (feve < ini) {
      fila.vencidos = monto;
    } else if (feve > finUltimo) {
      fila.mayores = monto;
    } else {
      const idx = Math.floor(diasEntre(feve, ini) / diasRango);
      const i = Math.min(Math.max(idx, 0), cantRangos - 1);
      const arr = resultado.rangos.map(() => 0);
      arr[i] = monto;
      fila.rangos = arr;
    }
    resultado.filas.push(fila);
  }

  return resultado;
}

// ---------- Antigüedad de la deuda (por documento) ----------
// Los rangos se basan en los DIAS VENCIDOS de cada documento.
function calcularAntiguedad(documentos, cantRangos, diasRango) {
  const resultado = { rangos: [], filas: [] };

  if (cantRangos < 1 || diasRango < 1) return resultado;

  for (let i = 0; i < cantRangos; i++) {
    const min = i * diasRango + 1;
    const max = (i + 1) * diasRango;
    resultado.rangos.push({ min, max, label: `${min} - ${max} días` });
  }
  const maxUltimo = resultado.rangos[cantRangos - 1].max;

  for (const d of documentos) {
    const monto = Number(d.saldo || 0);
    const dias = Number(d.dias_vencido || 0);
    const fila = { doc: d, alDia: 0, rangos: [], mayores: 0 };

    if (dias <= 0) {
      fila.alDia = monto;
    } else if (dias > maxUltimo) {
      fila.mayores = monto;
    } else {
      const idx = Math.floor((dias - 1) / diasRango);
      const i = Math.min(Math.max(idx, 0), cantRangos - 1);
      const arr = resultado.rangos.map(() => 0);
      arr[i] = monto;
      fila.rangos = arr;
    }
    resultado.filas.push(fila);
  }

  return resultado;
}

// ---------- Columnas de la tabla de documentos ----------
const COL_DOC = 'Documento';
const COL_NRO = 'Nro';
const COL_EST = 'Estado';
const COL_CONDP = 'Cond. Pago';
const COL_IMPORTE = 'Importe Total';
const COL_AMORTIZA = 'Amortiza';
const COL_SALDO = 'Saldo';
const COL_BANCO = 'Banco';
const COL_NROUNICO = 'Nro. Único';
const COL_VEND = 'Vendedor';

function celdasBase(d) {
  return (
    <>
      <td className="mono">{d.tipo_documento_desc || d.cob_codo}</td>
      <td className="mono">{d.cob_seri}-{d.cob_nums}</td>
      <td className="mono">{d.estado_descripcion}</td>
      <td className="mono">{d.cond_pago_desc}</td>
      <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>{d.moneda_signo} {fmt(d.saldo)}</td>
    </>
  );
}

function celdasPendientes(d) {
  return (
    <>
      <td className="mono">{d.tipo_documento_desc || d.cob_codo}</td>
      <td className="mono">{d.cob_seri}-{d.cob_nums}</td>
      <td className="mono">{d.estado_descripcion}</td>
      <td className="mono">{d.cond_pago_desc}</td>
      <td className="mono">{d.moneda_signo} {fmt(d.importe_original)}</td>
      <td className="mono">{d.moneda_signo} {fmt(d.pagado)}</td>
      <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>{d.moneda_signo} {fmt(d.saldo)}</td>
      <td className="mono">{d.banco_desc || ''}</td>
      <td className="mono">{d.cob_nuni || ''}</td>
      <td className="mono">{d.vendedor_nombre || ''}</td>
    </>
  );
}

function celdasFinales(d) {
  return (
    <>
      <td className="mono">{d.vendedor_nombre || ''}</td>
    </>
  );
}

function filaPendientesExportar(d) {
  return [
    d.tipo_documento_desc || d.cob_codo,
    `${d.cob_seri}-${d.cob_nums}`,
    d.estado_descripcion,
    d.cond_pago_desc,
    `${d.moneda_signo} ${fmt(d.importe_original)}`,
    `${d.moneda_signo} ${fmt(d.pagado)}`,
    `${d.moneda_signo} ${fmt(d.saldo)}`,
    d.banco_desc || '',
    d.cob_nuni || '',
    d.vendedor_nombre || ''
  ];
}

// ---------- Componente principal ----------
export default function ClienteDetalleScreen() {
  const { codigo } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('pendientes');

  // Parámetros del cronograma de vencimientos
  const [cantRangos, setCantRangos] = useState(4);
  const [diasRango, setDiasRango] = useState(30);
  const [fechaInicial, setFechaInicial] = useState(hoyISO());

  // Parámetros de la antigüedad de la deuda
  const [tipoRango, setTipoRango] = useState('mensual'); // semanal|quincenal|mensual|otro
  const [diasRangoAnti, setDiasRangoAnti] = useState(30);
  const [cantRangosAnti, setCantRangosAnti] = useState(4);

  const cargar = useCallback(async () => {
    try {
      const res = await apiGet(`/clientes/${codigo}`, token);
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [codigo, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const cronograma = useMemo(
    () => data ? calcularCronograma(data.documentos, cantRangos, diasRango, fechaInicial) : null,
    [data, cantRangos, diasRango, fechaInicial]
  );

  const antiguedad = useMemo(
    () => data ? calcularAntiguedad(data.documentos, cantRangosAnti, diasRangoAnti) : null,
    [data, cantRangosAnti, diasRangoAnti]
  );

  const seleccionarTipoRango = (tipo) => {
    setTipoRango(tipo);
    const dias = { semanal: 7, quincenal: 15, mensual: 30 }[tipo];
    if (dias) setDiasRangoAnti(dias);
  };

  if (error) return <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>;
  if (!data) return <div className="vacio">Cargando...</div>;

  const { cliente, resumen, documentos, ultima_incidencia } = data;

  const colPendientes = [COL_DOC, COL_NRO, COL_EST, COL_CONDP, COL_IMPORTE, COL_AMORTIZA, COL_SALDO, COL_BANCO, COL_NROUNICO, COL_VEND];
  const filasPendientes = documentos.map((d) => filaPendientesExportar(d));

  const colCronograma = [COL_DOC, COL_NRO, COL_EST, COL_CONDP, COL_SALDO, 'Vencidos',
    ...cronograma.rangos.map((r) => r.label), `Mayor a ${cronograma.rangos.length ? fmtFecha(cronograma.rangos[cronograma.rangos.length - 1].dFin) : ''}`, COL_VEND];
  const filasCronograma = cronograma.filas.map((f) => [
    f.doc.tipo_documento_desc || f.doc.cob_codo,
    `${f.doc.cob_seri}-${f.doc.cob_nums}`,
    f.doc.estado_descripcion,
    f.doc.cond_pago_desc,
    `${f.doc.moneda_signo} ${fmt(f.doc.saldo)}`,
    f.vencidos ? fmt(f.vencidos) : '',
    ...cronograma.rangos.map((r, i) => (f.rangos[i] ? fmt(f.rangos[i]) : '')),
    f.mayores ? fmt(f.mayores) : '',
    f.doc.vendedor_nombre || ''
  ]);

  const colAntiguedad = [COL_DOC, COL_NRO, COL_EST, COL_CONDP, COL_SALDO, 'Al día',
    ...antiguedad.rangos.map((r) => r.label), `Mayores a ${antiguedad.rangos.length ? antiguedad.rangos[antiguedad.rangos.length - 1].max : ''} días`, COL_VEND];
  const filasAntiguedad = antiguedad.filas.map((f) => [
    f.doc.tipo_documento_desc || f.doc.cob_codo,
    `${f.doc.cob_seri}-${f.doc.cob_nums}`,
    f.doc.estado_descripcion,
    f.doc.cond_pago_desc,
    `${f.doc.moneda_signo} ${fmt(f.doc.saldo)}`,
    f.alDia ? fmt(f.alDia) : '',
    ...antiguedad.rangos.map((r, i) => (f.rangos[i] ? fmt(f.rangos[i]) : '')),
    f.mayores ? fmt(f.mayores) : '',
    f.doc.vendedor_nombre || ''
  ]);

  // Resumen por pestaña
  const totalSaldo = documentos.reduce((a, d) => a + Number(d.saldo || 0), 0);
  const resumenCronograma = [
    ['Vencidos', ...cronograma.rangos.map((r) => r.label), `Mayor a ${cronograma.rangos.length ? fmtFecha(cronograma.rangos[cronograma.rangos.length - 1].dFin) : ''}`],
    [fmt(cronograma.filas.reduce((a, f) => a + f.vencidos, 0)),
     ...cronograma.rangos.map((_, i) => fmt(cronograma.filas.reduce((a, f) => a + (f.rangos[i] || 0), 0))),
     fmt(cronograma.filas.reduce((a, f) => a + f.mayores, 0))]
  ];
  const resumenAntiguedad = [
    ['Al día', ...antiguedad.rangos.map((r) => r.label), `Mayores a ${antiguedad.rangos.length ? antiguedad.rangos[antiguedad.rangos.length - 1].max : ''} días`],
    [fmt(antiguedad.filas.reduce((a, f) => a + f.alDia, 0)),
     ...antiguedad.rangos.map((_, i) => fmt(antiguedad.filas.reduce((a, f) => a + (f.rangos[i] || 0), 0))),
     fmt(antiguedad.filas.reduce((a, f) => a + f.mayores, 0))]
  ];

  return (
    <div>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>← Volver</button>

      <div className="card" style={{ background: 'var(--primario)', color: '#fff', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{cliente.ter_deno}</div>
        <div style={{ color: '#c8d1e0', fontSize: 13, marginTop: 2 }}>
          {cliente.ter_rucn || 'Sin RUC'} {cliente.ter_dire ? `| ${cliente.ter_dire}` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Situación actual</div>
          <div className="mutado">Documentos pendientes: <strong>{resumen.total_documentos}</strong></div>
          <div className="mutado" style={{ color: 'var(--rojo)' }}>Vencidos: <strong>{resumen.total_vencidos}</strong></div>
          {resumen.saldo_PEN ? <div className="mutado">Saldo S/. <strong>{fmt(resumen.saldo_PEN)}</strong></div> : null}
          {resumen.saldo_USD ? <div className="mutado">Saldo US$ <strong>{fmt(resumen.saldo_USD)}</strong></div> : null}
          <div className="mutado" style={{ marginTop: 8, borderTop: '1px solid var(--borde)', paddingTop: 8 }}>
            Vendedor: <strong>{cliente.vendedor_nombre || cliente.ter_core || '-'}</strong>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Última incidencia registrada</div>
          {ultima_incidencia ? (
            <>
              <div className="mutado">Fecha: <strong>{ultima_incidencia.fe_regi}</strong></div>
              <div className="mutado">Detalle: {ultima_incidencia.inc_desc || '-'}</div>
              <div className="mutado">Estado: <strong>{estadoTexto(ultima_incidencia.inc_estc)}</strong></div>
            </>
          ) : (
            <div className="mutado">Sin incidencias registradas</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button className="btn" onClick={() => navigate(`/incidencias/nueva?cliente=${cliente.ter_cote}&nombre=${encodeURIComponent(cliente.ter_deno)}`)}>
          + Registrar incidencia
        </button>
        <button className="btn btn-verde" onClick={() => navigate(`/clientes/${cliente.ter_cote}/incidencias`)}>
          Ver incidencias
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: pestana === 'pendientes' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'pendientes' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('pendientes')}
        >
          <DocumentIcon size={18} /> Documentos Pendientes
        </button>
        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: pestana === 'cronograma' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'cronograma' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('cronograma')}
        >
          <CalendarIcon size={18} /> Cronograma de Vencimientos
        </button>
        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: pestana === 'antiguedad' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'antiguedad' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('antiguedad')}
        >
          <TimeIcon size={18} /> Antigüedad de la Deuda
        </button>
        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: pestana === 'resumen' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'resumen' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('resumen')}
        >
          <StatsIcon size={18} /> Resumen
        </button>
      </div>

      {pestana === 'pendientes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)' }}>Documentos pendientes</div>
            {documentos.length > 0 && <Exportar nombreArchivo={`documentos_${cliente.ter_cote}`} columnas={colPendientes} filas={filasPendientes} />}
          </div>
          {documentos.length === 0 ? (
            <div className="vacio">Cliente sin documentos pendientes</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla">
                <thead>
                  <tr>
                    {colPendientes.map((c) => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((d) => (
                    <tr key={`${d.cob_tivo}-${d.cob_nuvo}`}>
                      {celdasPendientes(d)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pestana === 'cronograma' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="mutado" style={{ marginBottom: 8 }}>Cronograma de vencimientos</div>
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

          {documentos.length === 0 ? (
            <div className="vacio">Cliente sin documentos pendientes</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Exportar nombreArchivo={`cronograma_${cliente.ter_cote}`} columnas={colCronograma} filas={filasCronograma} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      {colCronograma.map((c, i) => <th key={i} className="mono">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cronograma.filas.map((f, idx) => (
                      <tr key={idx}>
                        {celdasBase(f.doc)}
                        <td className="mono" style={{ color: 'var(--rojo)', fontWeight: 700 }}>{f.vencidos ? fmt(f.vencidos) : ''}</td>
                        {cronograma.rangos.map((r, i) => (
                          <td key={i} className="mono">{f.rangos[i] ? fmt(f.rangos[i]) : ''}</td>
                        ))}
                        <td className="mono" style={{ fontWeight: 700 }}>{f.mayores ? fmt(f.mayores) : ''}</td>
                        {celdasFinales(f.doc)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {pestana === 'antiguedad' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="mutado" style={{ marginBottom: 8 }}>Antigüedad de la deuda (por días vencidos)</div>
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
                  style={{ border: '1px solid var(--borde)', background: tipoRango === o.clave ? 'var(--primario)' : 'var(--tarjeta)', color: tipoRango === o.clave ? '#fff' : 'var(--texto)' }}
                  onClick={() => seleccionarTipoRango(o.clave)}
                >
                  {o.texto}
                </button>
              ))}
              {tipoRango === 'otro' && (
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

          {documentos.length === 0 ? (
            <div className="vacio">Cliente sin documentos pendientes</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Exportar nombreArchivo={`antiguedad_${cliente.ter_cote}`} columnas={colAntiguedad} filas={filasAntiguedad} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      {colAntiguedad.map((c, i) => <th key={i} className="mono">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {antiguedad.filas.map((f, idx) => (
                      <tr key={idx}>
                        {celdasBase(f.doc)}
                        <td className="mono">{f.alDia ? fmt(f.alDia) : ''}</td>
                        {antiguedad.rangos.map((r, i) => (
                          <td key={i} className="mono">{f.rangos[i] ? fmt(f.rangos[i]) : ''}</td>
                        ))}
                        <td className="mono" style={{ fontWeight: 700 }}>{f.mayores ? fmt(f.mayores) : ''}</td>
                        {celdasFinales(f.doc)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {pestana === 'resumen' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)' }}>Resumen</div>
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', marginBottom: 6 }}>Documentos pendientes</div>
            <div className="mutado">Documentos: <strong>{documentos.length}</strong></div>
            <div className="mutado">Saldo total: <strong>{fmt(totalSaldo)}</strong></div>
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)' }}>Cronograma de vencimientos</div>
              <Exportar nombreArchivo={`resumen_cronograma_${cliente.ter_cote}`} columnas={resumenCronograma[0]} filas={[resumenCronograma[1]]} />
            </div>
            <table className="tabla">
              <thead><tr>{resumenCronograma[0].map((c, i) => <th key={i} className="mono">{c}</th>)}</tr></thead>
              <tbody><tr>{resumenCronograma[1].map((c, i) => <td key={i} className="mono">{c}</td>)}</tr></tbody>
            </table>
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)' }}>Antigüedad de la deuda</div>
              <Exportar nombreArchivo={`resumen_antiguedad_${cliente.ter_cote}`} columnas={resumenAntiguedad[0]} filas={[resumenAntiguedad[1]]} />
            </div>
            <table className="tabla">
              <thead><tr>{resumenAntiguedad[0].map((c, i) => <th key={i} className="mono">{c}</th>)}</tr></thead>
              <tbody><tr>{resumenAntiguedad[1].map((c, i) => <td key={i} className="mono">{c}</td>)}</tr></tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}