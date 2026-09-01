import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet } from '../api/client';
import CampoBusqueda from './CampoBusqueda';
import { CheckIcon, CloseIcon } from './Iconos';

// Filtro de lineas estilo Excel: boton que abre panel desplegable.
// Permite buscar por nombre/codigo y marcar varias.
export default function FiltroLineas({ token, seleccionados, onCambio }) {
  const [lineas, setLineas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [temp, setTemp] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    let activo = true;
    apiGet('/articulos/lineas', token)
      .then((data) => { if (activo) setLineas(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { activo = false; };
  }, [token]);

  useEffect(() => {
    const manejarClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return lineas;
    return lineas.filter((l) =>
      (l.descripcion || '').toLowerCase().includes(b) ||
      (l.codigo || '').toLowerCase().includes(b)
    );
  }, [lineas, busqueda]);

  const tempSet = new Set(temp);

  const abrir = () => { setTemp([...(seleccionados || [])]); setBusqueda(''); setAbierto(true); };
  const toggle = (c) => setTemp((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const aplicar = () => { onCambio(temp); setAbierto(false); };
  const cancelar = () => setAbierto(false);
  const limpiar = () => setTemp([]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="btn btn-ghost"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 14px', fontSize: 14, fontWeight: 700,
          border: '1px solid var(--borde)', color: 'var(--texto)', background: 'var(--tarjeta)'
        }}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
      >
        Lineas{seleccionados && seleccionados.length > 0 ? ` (${seleccionados.length})` : ''}
        <span style={{ fontSize: 10 }}>{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 6, width: 320, padding: 10 }}>
          <CampoBusqueda width="100%" value={busqueda} onChange={setBusqueda} placeholder="Buscar linea..." style={{ fontSize: 13, padding: '8px 12px', paddingLeft: 34 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span className="mutado">{temp.length} seleccionadas</span>
            {temp.length > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '2px 6px', border: 'none', color: 'var(--rojo)' }} onClick={limpiar}>Limpiar</button>
            )}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4, borderTop: '1px solid var(--borde)', paddingTop: 4 }}>
            {filtrados.map((l) => (
              <label key={l.codigo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={tempSet.has(l.codigo)} onChange={() => toggle(l.codigo)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descripcion}</span>
              </label>
            ))}
            {filtrados.length === 0 && <div className="mutado" style={{ padding: '8px 6px' }}>Sin resultados</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid var(--borde)', paddingTop: 10 }}>
            <button className="btn btn-aceptar btn-accion" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={aplicar}><CheckIcon size={18} /> Aplicar</button>
            <button className="btn btn-cancelar btn-accion" style={{ flex: 1, padding: '8px 10px', fontSize: 13 }} onClick={cancelar}><CloseIcon size={16} /> Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
