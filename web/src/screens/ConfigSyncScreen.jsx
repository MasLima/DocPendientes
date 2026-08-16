import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';

export default function ConfigSyncScreen() {
  const { token } = useAuth();
  const [log, setLog] = useState([]);
  const [ejecutando, setEjecutando] = useState(false);
  const [resultado, setResultado] = useState('');

  const cargarLog = useCallback(async () => {
    try {
      const data = await apiGet('/sync/log', token);
      setLog(Array.isArray(data) ? data : data.value || []);
    } catch { /* sin permiso o error */ }
  }, [token]);

  useEffect(() => { cargarLog(); }, [cargarLog]);

  const ejecutarSync = async () => {
    setEjecutando(true);
    setResultado('');
    try {
      const r = await apiPost('/sync/ejecutar', {}, token);
      setResultado(
        `Vendedores: ${r.resultados?.maestros?.vendedores} | ` +
        `Clientes: ${r.resultados?.maestros?.clientes} | ` +
        `Documentos: ${r.resultados?.documentos?.documentos} | ` +
        `Incidencias nuevas: ${r.resultados?.incidencias?.incidencias} | ` +
        `Actualizadas: ${r.resultados?.incidencias?.actualizadas}`
      );
      cargarLog();
    } catch (err) {
      setResultado(`Error: ${err.message}`);
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <Link to="/configuracion" className="btn btn-ghost" style={{ display: 'inline-block', marginBottom: 12 }}>← Configuración</Link>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Sincronización</h2>

      <div className="card" style={{ marginBottom: 14 }}>
        <p className="mutado" style={{ marginTop: 0 }}>
          Sincroniza los datos desde el ERP: maestros (vendedores y clientes), documentos pendientes e incidencias.
        </p>
        <button className="btn" onClick={ejecutarSync} disabled={ejecutando}>
          {ejecutando ? 'Sincronizando...' : 'Ejecutar sincronización ahora'}
        </button>
        {resultado && (
          <div style={{ marginTop: 10, fontSize: 13, color: resultado.startsWith('Error') ? 'var(--rojo)' : 'var(--verde)' }}>
            {resultado}
          </div>
        )}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Historial de sincronizaciones</div>
      {log.length === 0 ? (
        <div className="vacio">Sin registros</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Proceso</th><th>Resultado</th><th>Fecha</th><th>Filas</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            {log.slice(0, 20).map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.proceso}</td>
                <td><span className="badge" style={{ backgroundColor: l.resultado === 'OK' ? 'var(--verde)' : 'var(--rojo)' }}>{l.resultado}</span></td>
                <td className="mono">{l.fecha}</td>
                <td className="mono">{l.filas}</td>
                <td className="mutado">{l.detalle || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}