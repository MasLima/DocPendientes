import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import Exportar from '../components/Exportar';
import { PlusIcon } from '../components/Iconos';

const POR_PAGINA_INC = 15;

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
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [paginaInc, setPaginaInc] = useState(1);

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

  useEffect(() => { setPaginaInc(1); }, [mostrarHistorial]);

  const resumen = frecuencia.find((f) => String(f.ter_cote) === String(codigo)) || {};
  const ultima = incidencias[0];
  const nombre = ultima?.cliente_nombre || resumen.cliente_nombre || codigo;

  const incidenciasVisibles = useMemo(() => {
    if (mostrarHistorial) {
      const ini = (paginaInc - 1) * POR_PAGINA_INC;
      return incidencias.slice(ini, ini + POR_PAGINA_INC);
    }
    return incidencias.slice(0, POR_PAGINA_INC);
  }, [incidencias, mostrarHistorial, paginaInc]);

  const totalPaginasInc = useMemo(
    () => Math.max(1, Math.ceil(incidencias.length / POR_PAGINA_INC)),
    [incidencias]
  );

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)' }}>
            {mostrarHistorial ? 'Historial completo' : `Últimas ${Math.min(POR_PAGINA_INC, incidencias.length)} incidencias`}
          </div>
          {incidencias.length > POR_PAGINA_INC && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--borde)', color: mostrarHistorial ? 'var(--rojo)' : 'var(--primario)' }}
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
            >
              {mostrarHistorial ? '← Ver menos' : `Ver historial (${incidencias.length}) →`}
            </button>
          )}
        </div>
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
        <>
          <table className="tabla">
            <thead>
              <tr><th>#</th><th>Vendedor</th><th>Descripción</th><th>Acción</th><th>Fecha</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {incidenciasVisibles.map((it) => (
                <tr key={it.inc_codi}>
                  <td className="mono">#{it.inc_codi}</td>
                  <td>{it.vendedor_nombre || '-'}</td>
                  <td style={{ maxWidth: 360 }}>{it.inc_desc}</td>
                  <td style={{ maxWidth: 240 }}>{it.inc_acci || '-'}</td>
                  <td className="mono">{it.fe_regi}</td>
                  <td><span className="badge" style={{ backgroundColor: estadoColor(it.inc_estc) }}>{estadoTexto(it.inc_estc)}</span></td>
                </tr>
              ))}
              {incidenciasVisibles.length === 0 && (
                <tr><td colSpan={6} className="vacio">Sin incidencias</td></tr>
              )}
            </tbody>
          </table>

          {mostrarHistorial && totalPaginasInc > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaInc <= 1} onClick={() => setPaginaInc(paginaInc - 1)}>
                ← Anterior
              </button>
              <span className="mutado">
                Página {paginaInc} de {totalPaginasInc} · mostrando {incidenciasVisibles.length} de {incidencias.length}
              </span>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaInc >= totalPaginasInc} onClick={() => setPaginaInc(paginaInc + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
