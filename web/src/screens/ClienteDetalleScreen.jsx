import React, { useState, useEffect, useCallback } from 'react';
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

export default function ClienteDetalleScreen() {
  const { codigo } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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

      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Documentos pendientes</div>
      {documentos.length === 0 ? (
        <div className="vacio">Cliente sin documentos pendientes</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Nro</th><th>Emisión</th><th>Venc.</th><th>Días venc.</th><th>Saldo</th><th>Pagado</th></tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={`${d.cob_tivo}-${d.cob_nuvo}`}>
                <td className="mono">{d.cob_seri}-{d.cob_nums}</td>
                <td className="mono">{d.fecha_emision || '-'}</td>
                <td className="mono">{d.fecha_vencimiento || '-'}</td>
                <td className="mono" style={{ color: d.dias_vencido > 0 ? 'var(--rojo)' : 'var(--verde)', fontWeight: 600 }}>
                  {d.dias_vencido > 0 ? `${d.dias_vencido} d` : 'ok'}
                </td>
                <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>
                  {d.moneda_signo} {fmt(d.saldo)}
                </td>
                <td className="mono">{d.moneda_signo} {fmt(d.pagado)} de {fmt(d.importe_original)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}