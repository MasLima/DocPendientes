import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';
import Exportar from '../components/Exportar';

const PROCESOS = [
  { clave: 'maestros', etiqueta: 'Maestros (vendedores y clientes)' },
  { clave: 'condiciones', etiqueta: 'Condiciones de pago' },
  { clave: 'tipos', etiqueta: 'Tipos de documento' },
  { clave: 'bancos', etiqueta: 'Bancos' },
  { clave: 'documentos', etiqueta: 'Documentos pendientes' },
  { clave: 'incidencias', etiqueta: 'Incidencias' }
];

export default function ConfigSyncScreen() {
  const { token } = useAuth();
  const [log, setLog] = useState([]);
  const [ejecutando, setEjecutando] = useState(false);
  const [resultado, setResultado] = useState('');
  const [procesos, setProcesos] = useState(PROCESOS.map((p) => p.clave));

  const cargarLog = useCallback(async () => {
    try {
      const data = await apiGet('/sync/log', token);
      setLog(Array.isArray(data) ? data : data.value || []);
    } catch { /* sin permiso o error */ }
  }, [token]);

  useEffect(() => { cargarLog(); }, [cargarLog]);

  const toggleProceso = (clave) => {
    setProcesos((prev) => (prev.includes(clave) ? prev.filter((p) => p !== clave) : [...prev, clave]));
  };

  const ejecutarSync = async () => {
    setEjecutando(true);
    setResultado('');
    try {
      const r = await apiPost('/sync/ejecutar', { procesos }, token);
      const res = r.resultados || {};
      const partes = [];
      if (res.maestros) partes.push(`Vendedores: ${res.maestros.vendedores} | Clientes: ${res.maestros.clientes}`);
      if (res.condiciones) partes.push(`Condiciones: ${res.condiciones.condiciones}`);
      if (res.tipos) partes.push(`Tipos: ${res.tipos.tipos}`);
      if (res.bancos) partes.push(`Bancos: ${res.bancos.bancos}`);
      if (res.documentos) partes.push(`Documentos: ${res.documentos.documentos}`);
      if (res.incidencias) partes.push(`Incidencias nuevas: ${res.incidencias.incidencias} | Actualizadas: ${res.incidencias.actualizadas}`);
      setResultado(partes.join(' | '));
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
          Selecciona qué procesos sincronizar desde el ERP y pulsa el botón.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {PROCESOS.map((p) => (
            <label key={p.clave} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={procesos.includes(p.clave)} onChange={() => toggleProceso(p.clave)} />
              <span style={{ fontSize: 14 }}>{p.etiqueta}</span>
            </label>
          ))}
        </div>
        <button className="btn" onClick={ejecutarSync} disabled={ejecutando || procesos.length === 0}>
          {ejecutando ? 'Sincronizando...' : 'Ejecutar sincronización ahora'}
        </button>
        {resultado && (
          <div style={{ marginTop: 10, fontSize: 13, color: resultado.startsWith('Error') ? 'var(--rojo)' : 'var(--verde)' }}>
            {resultado}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)' }}>Historial de sincronizaciones</div>
        {log.length > 0 && (
          <Exportar
            nombreArchivo="historial_sync"
            columnas={['Proceso', 'Resultado', 'Fecha', 'Filas', 'Detalle']}
            filas={log.map((l) => [l.proceso, l.resultado, l.fecha, l.filas, l.detalle || ''])}
          />
        )}
      </div>
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