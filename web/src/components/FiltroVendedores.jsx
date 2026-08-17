import React, { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../api/client';
import CampoBusqueda from './CampoBusqueda';

// Filtro de vendedores multi-selección con búsqueda por aproximación.
// Carga la lista de vendedores una sola vez y filtra en memoria.
export default function FiltroVendedores({ token, seleccionados, onCambio }) {
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let activo = true;
    apiGet('/clientes/vendedores', token)
      .then((data) => { if (activo) setVendedores(Array.isArray(data) ? data : data.value || []); })
      .catch(() => {});
    return () => { activo = false; };
  }, [token]);

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return vendedores;
    return vendedores.filter((v) =>
      (v.ter_deno || '').toLowerCase().includes(b) ||
      (v.ter_cote || '').includes(b)
    );
  }, [vendedores, busqueda]);

  const seleccionadosSet = new Set(seleccionados || []);
  const seleccionadosDetalle = (seleccionados || [])
    .map((c) => vendedores.find((v) => v.ter_cote === c))
    .filter(Boolean);

  const toggle = (c) => {
    const nuevo = seleccionadosSet.has(c)
      ? (seleccionados || []).filter((x) => x !== c)
      : [...(seleccionados || []), c];
    onCambio(nuevo);
  };

  return (
    <div style={{ position: 'relative', minWidth: 260 }}>
      <div className="card" style={{ padding: 8 }}>
        <CampoBusqueda
          width="100%"
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar vendedor..."
          style={{ fontSize: 13, padding: '8px 12px', paddingLeft: 34 }}
        />
        <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
          {filtrados.map((v) => (
            <label key={v.ter_cote} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={seleccionadosSet.has(v.ter_cote)} onChange={() => toggle(v.ter_cote)} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.ter_cote} - {v.ter_deno}</span>
            </label>
          ))}
          {filtrados.length === 0 && <div className="mutado" style={{ padding: '8px 6px' }}>Sin resultados</div>}
        </div>
        {seleccionadosDetalle.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, borderTop: '1px solid var(--borde)', paddingTop: 8 }}>
            {seleccionadosDetalle.map((v) => (
              <span key={v.ter_cote} className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {v.ter_cote}
                <button
                  className="btn btn-ghost"
                  style={{ padding: 0, fontSize: 12, lineHeight: 1, border: 'none', cursor: 'pointer', color: 'var(--rojo)' }}
                  title={`Quitar ${v.ter_deno}`}
                  onClick={() => toggle(v.ter_cote)}
                >
                  ✕
                </button>
              </span>
            ))}
            {seleccionados.length > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '2px 8px', border: 'none', color: 'var(--rojo)' }} onClick={() => onCambio([])}>
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}