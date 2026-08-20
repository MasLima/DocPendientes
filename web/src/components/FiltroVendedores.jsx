import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet } from '../api/client';
import CampoBusqueda from './CampoBusqueda';
import { PeopleIcon, CheckIcon, CloseIcon } from './Iconos';

// Filtro de vendedores estilo Excel: botón que abre un panel desplegable.
// - No inicia desplegado: se abre solo al hacer clic en el botón.
// - Permite buscar vendedores por aproximación y marcar varios.
// - Botones Aplicar (ejecuta la selección) y Cancelar (descarta y cierra).
export default function FiltroVendedores({ token, seleccionados, onCambio }) {
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [temp, setTemp] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    let activo = true;
    apiGet('/clientes/vendedores', token)
      .then((data) => { if (activo) setVendedores(Array.isArray(data) ? data : data.value || []); })
      .catch(() => {});
    return () => { activo = false; };
  }, [token]);

  // Cerrar al hacer clic fuera del componente.
  useEffect(() => {
    const manejarClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return vendedores;
    return vendedores.filter((v) =>
      (v.ter_deno || '').toLowerCase().includes(b) ||
      (v.ter_cote || '').includes(b)
    );
  }, [vendedores, busqueda]);

  const tempSet = new Set(temp);

  const abrir = () => {
    setTemp([...(seleccionados || [])]);
    setBusqueda('');
    setAbierto(true);
  };

  const toggle = (c) => {
    setTemp((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const aplicar = () => {
    onCambio(temp);
    setAbierto(false);
  };

  const cancelar = () => {
    setAbierto(false);
  };

  const limpiar = () => {
    setTemp([]);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="btn btn-ghost"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          fontSize: 14,
          fontWeight: 700,
          border: '1px solid var(--borde)',
          color: 'var(--texto)',
          background: 'var(--tarjeta)'
        }}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
      >
        <PeopleIcon size={16} />
        {seleccionados && seleccionados.length > 0
          ? `Vendedores (${seleccionados.length})`
          : 'Filtrar por vendedor'}
        <span style={{ fontSize: 10 }}>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 20,
            marginTop: 6,
            width: 320,
            padding: 10
          }}
        >
          <CampoBusqueda
            width="100%"
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar vendedor por nombre o código..."
            style={{ fontSize: 13, padding: '8px 12px', paddingLeft: 34 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span className="mutado">{temp.length} seleccionados</span>
            {temp.length > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '2px 6px', border: 'none', color: 'var(--rojo)' }} onClick={limpiar}>
                Limpiar
              </button>
            )}
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4, borderTop: '1px solid var(--borde)', paddingTop: 4 }}>
            {filtrados.map((v) => (
              <label key={v.ter_cote} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={tempSet.has(v.ter_cote)} onChange={() => toggle(v.ter_cote)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.ter_cote} - {v.ter_deno}</span>
              </label>
            ))}
            {filtrados.length === 0 && <div className="mutado" style={{ padding: '8px 6px' }}>Sin resultados</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid var(--borde)', paddingTop: 10 }}>
            <button className="btn btn-aceptar btn-accion" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={aplicar}>
              <CheckIcon size={18} /> Aplicar
            </button>
            <button className="btn btn-cancelar btn-accion" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={cancelar}>
              <CloseIcon size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}