import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import Exportar from '../components/Exportar';

function fmt(v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Card({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primario)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Barra({ label, n, total, color }) {
  const pct = total > 0 ? Math.round(((n || 0) / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ width: 52, fontSize: 12, color: 'var(--texto-suave)' }}>{label}</span>
      <div style={{ flex: 1, height: 14, backgroundColor: 'var(--borde)', borderRadius: 7, overflow: 'hidden', margin: '0 8px' }}>
        <div style={{ height: 14, width: `${Math.max(pct, 2)}%`, backgroundColor: color, borderRadius: 7 }} />
      </div>
      <span style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{n || 0}</span>
    </div>
  );
}

export default function DashboardScreen() {
  const { token, user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [porVendedor, topClientes, antiguedad, incidencias, totales] = await Promise.all([
        apiGet('/dashboard/saldos-por-vendedor', token),
        apiGet('/dashboard/top-clientes', token),
        apiGet('/dashboard/documentos-antiguedad', token),
        apiGet('/dashboard/incidencias-resumen', token),
        apiGet('/dashboard/documentos-totales', token)
      ]);
      setDatos({
        porVendedor: Array.isArray(porVendedor) ? porVendedor : porVendedor.value || [],
        topClientes: Array.isArray(topClientes) ? topClientes : topClientes.value || [],
        antiguedad: Array.isArray(antiguedad) ? antiguedad[0] : antiguedad,
        incidencias: incidencias || {},
        totales: totales || {}
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!datos && !error) {
    return <div className="vacio">Cargando dashboard...</div>;
  }

  if (error && !datos) {
    return <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>;
  }

  const a = datos.antiguedad || {};
  const totalDocs = a.total || 0;
  const inc = datos.incidencias || {};

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Bienvenido, {user?.nombre || user?.use_logi}</div>
      <div className="mutado" style={{ marginBottom: 14 }}>Perfil: {user?.rol}</div>

      <Card title="Documentos por antigüedad de vencimiento">
        <Barra label="Al día" n={a.al_dia} total={totalDocs} color="#27ae60" />
        <Barra label="1-30 d" n={a.de_1_30} total={totalDocs} color="#e67e22" />
        <Barra label="31-60 d" n={a.de_31_60} total={totalDocs} color="#d35400" />
        <Barra label="61-90 d" n={a.de_61_90} total={totalDocs} color="#c0392b" />
        <Barra label="+90 d" n={a.mas_90} total={totalDocs} color="#8e44ad" />
        <div className="mutado" style={{ marginTop: 6 }}>Total documentos: {totalDocs}</div>
      </Card>

      <Card title="Top clientes deudores">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Exportar
            nombreArchivo="dashboard_top_clientes"
            columnas={['#', 'Cliente', 'Código', 'Saldo', 'Días vencido']}
            filas={(datos.topClientes || []).map((c, i) => [
              i + 1,
              c.cliente_nombre,
              c.cob_cote,
              `S/. ${fmt(c.saldo_pen)}${c.saldo_usd ? ` | US$ ${fmt(c.saldo_usd)}` : ''}`,
              c.max_dias_vencido > 0 ? `${c.max_dias_vencido} d venc` : 'al día'
            ])}
          />
        </div>
        <table className="tabla">
          <thead>
            <tr><th>#</th><th>Cliente</th><th>Saldo</th><th>Días vencido</th></tr>
          </thead>
          <tbody>
            {(datos.topClientes || []).slice(0, 8).map((c, i) => (
              <tr key={c.cob_cote}>
                <td style={{ fontWeight: 800, color: 'var(--primario)' }}>{i + 1}</td>
                <td>
                  {c.cliente_nombre}
                  <div className="mutado">{c.cob_cote}</div>
                </td>
                <td className="mono">S/. {fmt(c.saldo_pen)}{c.saldo_usd ? ` | US$ ${fmt(c.saldo_usd)}` : ''}</td>
                <td style={{ color: c.max_dias_vencido > 0 ? 'var(--rojo)' : 'var(--verde)', fontWeight: 600 }}>
                  {c.max_dias_vencido > 0 ? `${c.max_dias_vencido} d venc` : 'al día'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Saldos por vendedor">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Exportar
            nombreArchivo="dashboard_saldos_vendedor"
            columnas={['Vendedor', 'Código', 'Clientes', 'Docs', 'Saldo S/.']}
            filas={(datos.porVendedor || []).map((v) => [v.vendedor_nombre, v.ter_cote, v.num_clientes, v.total_documentos, `S/. ${fmt(v.saldo_pen)}`])}
          />
        </div>
        <table className="tabla">
          <thead>
            <tr><th>Vendedor</th><th>Clientes</th><th>Docs</th><th>Saldo S/.</th></tr>
          </thead>
          <tbody>
            {(datos.porVendedor || []).map((v) => (
              <tr key={v.ter_cote}>
                <td>{v.vendedor_nombre}</td>
                <td className="mono">{v.num_clientes}</td>
                <td className="mono">{v.total_documentos}</td>
                <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(v.saldo_pen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Incidencias y frecuencia de visitas">
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--fondo)', border: '1px solid var(--borde)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primario)' }}>{inc.totales?.total_incidencias || 0}</div>
            <div className="mutado">Incidencias</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--fondo)', border: '1px solid var(--borde)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primario)' }}>{inc.totales?.clientes_visitados || 0}</div>
            <div className="mutado">Clientes visitados</div>
          </div>
        </div>
        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Visitas</th><th>Última</th><th>Frecuencia</th></tr>
          </thead>
          <tbody>
            {(inc.resumen || []).slice(0, 8).map((r) => (
              <tr key={r.ter_cote}>
                <td>{r.cliente_nombre || r.ter_cote}</td>
                <td className="mono">{r.total_incidencias}</td>
                <td className="mono">{r.ultima_visita || '-'}</td>
                <td>{r.promedio_dias ? `cada ~${r.promedio_dias} d` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card title="Totales por condición de pago">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Exportar
              nombreArchivo="dashboard_por_condicion"
              columnas={['Condición de pago', 'Documentos', 'Saldo']}
              filas={(datos.totales.porCondicion || []).map((r) => [r.condicion, r.total_documentos, `S/. ${fmt(r.total_saldo)}`])}
            />
          </div>
          <table className="tabla">
            <thead>
              <tr><th>Condición</th><th>Docs</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {(datos.totales.porCondicion || []).map((r) => (
                <tr key={r.condicion}>
                  <td>{r.condicion}</td>
                  <td className="mono">{r.total_documentos}</td>
                  <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.total_saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Totales por estado">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Exportar
              nombreArchivo="dashboard_por_estado"
              columnas={['Estado', 'Documentos', 'Saldo']}
              filas={(datos.totales.porEstado || []).map((r) => [r.estado, r.total_documentos, `S/. ${fmt(r.total_saldo)}`])}
            />
          </div>
          <table className="tabla">
            <thead>
              <tr><th>Estado</th><th>Docs</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {(datos.totales.porEstado || []).map((r) => (
                <tr key={r.estado}>
                  <td>{r.estado}</td>
                  <td className="mono">{r.total_documentos}</td>
                  <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/. {fmt(r.total_saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <button className="btn btn-ghost" onClick={() => { setRefreshing(true); cargar(); }} disabled={refreshing}>
        {refreshing ? 'Actualizando...' : 'Actualizar'}
      </button>
    </div>
  );
}