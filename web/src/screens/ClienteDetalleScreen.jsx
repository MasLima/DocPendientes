import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

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

// ---------- Cálculo del cronograma de vencimientos ----------
function calcularCronograma(documentos, cantRangos, diasRango, fechaInicialISO) {
  const ini = parseFecha(fechaInicialISO);
  const totales = { vencidos: 0, rangos: [], mayores: 0 };

  if (!ini || cantRangos < 1 || diasRango < 1) return totales;

  for (let i = 0; i < cantRangos; i++) {
    const dIni = sumarDias(ini, i * diasRango);
    const dFin = sumarDias(ini, i * diasRango + diasRango - 1);
    totales.rangos.push({ dIni, dFin, label: `${fmtFecha(dIni)} - ${fmtFecha(dFin)}`, total: 0 });
  }
  const finUltimo = totales.rangos[cantRangos - 1].dFin;

  for (const d of documentos) {
    const feve = parseFecha(d.fecha_vencimiento);
    if (!feve) continue;
    const monto = Number(d.saldo || 0);

    if (feve < ini) {
      totales.vencidos += monto;
    } else if (feve > finUltimo) {
      totales.mayores += monto;
    } else {
      const idx = Math.floor(diasEntre(feve, ini) / diasRango);
      const i = Math.min(Math.max(idx, 0), cantRangos - 1);
      totales.rangos[i].total += monto;
    }
  }

  return totales;
}

// ---------- Antigüedad de la deuda (rangos por días vencido) ----------
const RANGOS_ANTIGUEDAD = [
  { min: -Infinity, max: 0, label: 'Al día' },
  { min: 1, max: 30, label: '1 - 30 días' },
  { min: 31, max: 60, label: '31 - 60 días' },
  { min: 61, max: 90, label: '61 - 90 días' },
  { min: 91, max: 120, label: '91 - 120 días' },
  { min: 121, max: 180, label: '121 - 180 días' },
  { min: 181, max: Infinity, label: 'Más de 180 días' }
];

function calcularAntiguedad(documentos) {
  const filas = RANGOS_ANTIGUEDAD.map((r) => ({ ...r, total: 0 }));
  for (const d of documentos) {
    const monto = Number(d.saldo || 0);
    const dias = Number(d.dias_vencido || 0);
    for (const r of filas) {
      if (dias >= r.min && dias <= r.max) {
        r.total += monto;
        break;
      }
    }
  }
  return filas;
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
    () => data ? calcularAntiguedad(data.documentos) : null,
    [data]
  );

  if (error) return <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>;
  if (!data) return <div className="vacio">Cargando...</div>;

  const { cliente, resumen, documentos, ultima_incidencia } = data;

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className="btn btn-ghost"
          style={{ background: pestana === 'pendientes' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'pendientes' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('pendientes')}
        >
          Documentos Pendientes
        </button>
        <button
          className="btn btn-ghost"
          style={{ background: pestana === 'cronograma' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'cronograma' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('cronograma')}
        >
          Cronograma de Vencimientos
        </button>
        <button
          className="btn btn-ghost"
          style={{ background: pestana === 'antiguedad' ? 'var(--primario)' : 'var(--tarjeta)', color: pestana === 'antiguedad' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
          onClick={() => setPestana('antiguedad')}
        >
          Antigüedad de la Deuda
        </button>
      </div>

      {pestana === 'pendientes' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Documentos pendientes</div>
          {documentos.length === 0 ? (
            <div className="vacio">Cliente sin documentos pendientes</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nro</th>
                    <th>Estado</th>
                    <th>Cond. Pago</th>
                    <th>Importe Total</th>
                    <th>Amortiza</th>
                    <th>Saldo</th>
                    <th>Banco</th>
                    <th>N° Letra</th>
                    <th>Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((d) => (
                    <tr key={`${d.cob_tivo}-${d.cob_nuvo}`}>
                      <td className="mono">{d.tipo_documento_desc || d.cob_codo}</td>
                      <td className="mono">{d.cob_seri}-{d.cob_nums}</td>
                      <td className="mono">{d.estado_descripcion}</td>
                      <td className="mono">{d.cond_pago_desc}</td>
                      <td className="mono">{d.moneda_signo} {fmt(d.importe_original)}</td>
                      <td className="mono">{d.moneda_signo} {fmt(d.pagado)}</td>
                      <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>{d.moneda_signo} {fmt(d.saldo)}</td>
                      <td className="mono">{d.banco_desc || (d.cob_banc ? d.cob_banc : '')}</td>
                      <td className="mono">{d.cob_nuni || ''}</td>
                      <td className="mono">{d.vendedor_nombre || ''}</td>
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
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Vencidos</th>
                    {cronograma.rangos.map((r, i) => (
                      <th key={i} className="mono">{r.label}</th>
                    ))}
                    <th>Mayores al Fecha Final</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono" style={{ color: 'var(--rojo)', fontWeight: 700 }}>{fmt(cronograma.vencidos)}</td>
                    {cronograma.rangos.map((r, i) => (
                      <td key={i} className="mono">{fmt(r.total)}</td>
                    ))}
                    <td className="mono" style={{ fontWeight: 700 }}>{fmt(cronograma.mayores)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pestana === 'antiguedad' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Antigüedad de la deuda</div>
          {documentos.length === 0 ? (
            <div className="vacio">Cliente sin documentos pendientes</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla">
                <thead>
                  <tr>
                    {antiguedad.map((r) => (
                      <th key={r.label}>{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {antiguedad.map((r) => (
                      <td key={r.label} className="mono">{fmt(r.total)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}