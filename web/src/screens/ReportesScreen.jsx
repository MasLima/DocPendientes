import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

function fmt(v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportesScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await apiGet('/reportes/saldos-por-cliente', token);
      setData(Array.isArray(res) ? res : res.value || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalSaldos = data.reduce((acc, r) => acc + (Number(r.saldo_pen) || 0), 0);
  const totalDocs = data.reduce((acc, r) => acc + (Number(r.total_documentos) || 0), 0);
  const totalVencidos = data.reduce((acc, r) => acc + (Number(r.total_vencidos) || 0), 0);

  return (
    <div>
      <div className="card" style={{ background: 'var(--primario)', color: '#fff', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#c8d1e0' }}>Saldos por cliente (S/.)</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Total pendiente: S/. {fmt(totalSaldos)}</div>
        <div style={{ fontSize: 12, color: '#c8d1e0' }}>
          Documentos: {totalDocs} | Vencidos: {totalVencidos} | Clientes: {data.length}
        </div>
      </div>

      {cargando ? (
        <div className="vacio">Cargando...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th><th>Docs</th><th>Vencidos</th><th>Máx días</th><th>Saldo S/.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.cob_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${r.cob_cote}`)}>
                <td style={{ fontWeight: 600 }}>{r.cliente_nombre}</td>
                <td className="mono">{r.total_documentos}</td>
                <td className="mono" style={{ color: r.total_vencidos > 0 ? 'var(--rojo)' : 'var(--texto-suave)' }}>{r.total_vencidos}</td>
                <td className="mono">{r.max_dias_vencido}</td>
                <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.saldo_pen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}