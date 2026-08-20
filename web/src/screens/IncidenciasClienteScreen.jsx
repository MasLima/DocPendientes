import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import Exportar from '../components/Exportar';
import { PlusIcon } from '../components/Iconos';

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

export default function IncidenciasClienteScreen() {
  const { codigo } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [incidencias, setIncidencias] = useState([]);
  const [frecuencia, setFrecuencia] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [data, freq] = await Promise.all([
        apiGet(`/incidencias/cliente/${codigo}`, token),
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
  }, [codigo, token]);

  useEffect(() => { cargar(); }, [cargar]);

  const resumen = frecuencia.find((f) => String(f.ter_cote) === String(codigo)) || {};
  const ultima = incidencias[0];
  const nombre = ultima?.cliente_nombre || resumen.cliente_nombre || codigo;

  return (
    <div>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>← Volver</button>

      <div className="card" style={{ background: 'var(--primario)', color: '#fff', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{nombre}</div>
        {resumen.vendedor_nombre ? (
          <div style={{ color: '#c8d1e0', fontSize: 13, marginTop: 2 }}>Vendedor: {resumen.vendedor_nombre}</div>
        ) : null}
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          <div><strong>{resumen.total_visitas || incidencias.length || 0}</strong> <span style={{ color: '#c8d1e0', fontSize: 12 }}>visitas</span></div>
          <div><strong>{resumen.ultima_visita || ultima?.fe_regi || '-'}</strong> <span style={{ color: '#c8d1e0', fontSize: 12 }}>última</span></div>
          <div><strong>{resumen.promedio_dias_entre_visitas ? `~${resumen.promedio_dias_entre_visitas} d` : '-'}</strong> <span style={{ color: '#c8d1e0', fontSize: 12 }}>frecuencia</span></div>
        </div>
        {resumen.dias_desde_ultima !== undefined && (
          <div style={{ color: '#f6e58d', fontSize: 12, marginTop: 8 }}>
            {resumen.dias_desde_ultima === 0 ? 'Visitado hoy' : `Hace ${resumen.dias_desde_ultima} días desde la última visita`}
          </div>
        )}
        {ultima ? (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, marginTop: 10 }}>
            <div style={{ color: '#c8d1e0', fontSize: 11 }}>Última incidencia ({ultima.fe_regi})</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{ultima.inc_desc}</div>
            {ultima.vendedor_nombre ? <div style={{ color: '#c8d1e0', fontSize: 11, marginTop: 4 }}>por {ultima.vendedor_nombre}</div> : null}
          </div>
        ) : (
          <div style={{ color: '#c8d1e0', fontSize: 13, marginTop: 10 }}>Sin incidencias registradas para este cliente</div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <button className="btn btn-adicionar btn-accion" onClick={() => navigate(`/incidencias/nueva?cliente=${codigo}&nombre=${encodeURIComponent(nombre)}`)}>
          <PlusIcon size={20} /> Registrar incidencia
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)' }}>Historial</div>
        {incidencias.length > 0 && (
          <Exportar
            nombreArchivo={`incidencias_${codigo}`}
            columnas={['#', 'Vendedor', 'Descripción', 'Acción', 'Fecha', 'Estado']}
            filas={incidencias.map((it) => [it.inc_codi, it.vendedor_nombre || '-', it.inc_desc, it.inc_acci || '-', it.fe_regi, estadoTexto(it.inc_estc)])}
          />
        )}
      </div>
      {cargando ? (
        <div className="vacio">Cargando...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>#</th><th>Vendedor</th><th>Descripción</th><th>Acción</th><th>Fecha</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {incidencias.map((it) => (
              <tr key={it.inc_codi}>
                <td className="mono">#{it.inc_codi}</td>
                <td>{it.vendedor_nombre || '-'}</td>
                <td style={{ maxWidth: 360 }}>{it.inc_desc}</td>
                <td style={{ maxWidth: 240 }}>{it.inc_acci || '-'}</td>
                <td className="mono">{it.fe_regi}</td>
                <td><span className="badge" style={{ backgroundColor: estadoColor(it.inc_estc) }}>{estadoTexto(it.inc_estc)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}