import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

export default function ClientesScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet('/clientes', token);
      setClientes(Array.isArray(data) ? data : data.value || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = clientes.filter((c) =>
    (c.ter_deno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.ter_rucn || '').includes(busqueda) ||
    (c.ter_cote || '').includes(busqueda)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Clientes</h2>
        <input
          className="input"
          style={{ width: 300 }}
          placeholder="Buscar por nombre, RUC o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {cargando ? (
        <div className="vacio">Cargando clientes...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr><th>Código</th><th>Cliente</th><th>RUC</th><th>Teléfono</th><th>Cond. pago</th><th></th></tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.ter_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${c.ter_cote}`)}>
                <td className="mono">{c.ter_cote}</td>
                <td style={{ fontWeight: 600 }}>{c.ter_deno || 'Sin nombre'}</td>
                <td className="mono">{c.ter_rucn || '-'}</td>
                <td>{c.ter_fono || '-'}</td>
                <td>{c.cond_pago_desc || c.ter_cocp || '-'}</td>
                <td>
                  <button
                    className="btn"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.ter_cote}/incidencias`); }}
                  >
                    Ver incidencias
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}