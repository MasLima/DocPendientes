import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import CampoBusqueda from '../components/CampoBusqueda';
import Exportar from '../components/Exportar';
import FiltroLineas from '../components/FiltroLineas';
import FiltroFamilias from '../components/FiltroFamilias';
import { DocumentIcon } from '../components/Iconos';

const POR_PAGINA = 100;
const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';

function ImageIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SortIcon({ col, orden, direccion }) {
  if (col !== orden) return <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.3 }}>⇅</span>;
  return <span style={{ fontSize: 9, marginLeft: 3 }}>{direccion === 'ASC' ? '▲' : '▼'}</span>;
}

export default function ArticulosScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [lineasSeleccionadas, setLineasSeleccionadas] = useState([]);
  const [familiasSeleccionadas, setFamiliasSeleccionadas] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [imagenModal, setImagenModal] = useState(null);
  const [orden, setOrden] = useState('ite_item');
  const [direccion, setDireccion] = useState('ASC');

  const cargar = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set('q', busqueda);
      if (lineasSeleccionadas.length === 1) params.set('linea', lineasSeleccionadas[0]);
      if (familiasSeleccionadas.length === 1) params.set('familia', familiasSeleccionadas[0]);
      params.set('orden', orden);
      params.set('direccion', direccion);
      const d = await apiGet(`/articulos?${params.toString()}`, token);
      setData(Array.isArray(d) ? d : []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, busqueda, lineasSeleccionadas, familiasSeleccionadas, orden, direccion]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [busqueda, lineasSeleccionadas, familiasSeleccionadas, orden, direccion]);
  useEffect(() => { setFamiliasSeleccionadas([]); }, [lineasSeleccionadas]);

  const ordenar = (col) => {
    if (orden === col) {
      setDireccion(direccion === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setOrden(col);
      setDireccion('ASC');
    }
  };

  const filtrados = useMemo(() => {
    let resultado = data;
    if (lineasSeleccionadas.length > 1) {
      const setL = new Set(lineasSeleccionadas);
      resultado = resultado.filter((a) => setL.has(a.ite_coli));
    }
    if (familiasSeleccionadas.length > 1) {
      const setF = new Set(familiasSeleccionadas);
      resultado = resultado.filter((a) => setF.has(a.ite_cofa));
    }
    return resultado;
  }, [data, lineasSeleccionadas, familiasSeleccionadas]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA),
    [filtrados, paginaSegura]
  );

  const formatearSaldo = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const colExportar = ['Codigo', 'Nombre', 'Estado', 'Saldo', 'Unidad', 'Linea', 'Familia', 'Costo S/.'];
  const filasExportar = filtrados.map((a) => [
    a.ite_item, a.ite_dsit || '',
    a.estado_desc || '-', formatearSaldo(a.saldo), a.ustock_abrev || '-',
    a.linea_desc || '-',
    a.familia_desc || '-', formatearSaldo(a.ite_copr)
  ]);

  const thStyle = (col) => ({
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          Articulos <span className="mutado">({filtrados.length})</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiltroLineas token={token} seleccionados={lineasSeleccionadas} onCambio={setLineasSeleccionadas} />
          <FiltroFamilias token={token} lineasSeleccionadas={lineasSeleccionadas} seleccionados={familiasSeleccionadas} onCambio={setFamiliasSeleccionadas} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
        {filtrados.length > 0 && (
          <Exportar nombreArchivo="articulos" columnas={colExportar} filas={filasExportar} titulo="Catalogo de Articulos" />
        )}
        <div style={{ flex: 1 }} />
        <CampoBusqueda width={280} value={busqueda} onChange={setBusqueda} placeholder="Buscar por codigo, nombre..." />
      </div>

      {error && <div style={{ color: '#c0392b', marginBottom: 12 }}>{error}</div>}

      {cargando ? (
        <div className="vacio">Cargando articulos...</div>
      ) : filtrados.length === 0 ? (
        <div className="vacio">Sin resultados</div>
      ) : (
        <>
          <table className="tabla" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th style={{ width: 110, ...thStyle('ite_item') }} onClick={() => ordenar('ite_item')}>
                  Codigo <SortIcon col="ite_item" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 260, ...thStyle('ite_dsit') }} onClick={() => ordenar('ite_dsit')}>
                  Nombre <SortIcon col="ite_dsit" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 120, ...thStyle('estado_desc') }} onClick={() => ordenar('estado_desc')}>
                  Estado <SortIcon col="estado_desc" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 90, textAlign: 'right', ...thStyle('saldo') }} onClick={() => ordenar('saldo')}>
                  Saldo <SortIcon col="saldo" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 50, ...thStyle('ustock_abrev') }} onClick={() => ordenar('ustock_abrev')}>
                  Und <SortIcon col="ustock_abrev" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 140, ...thStyle('linea_desc') }} onClick={() => ordenar('linea_desc')}>
                  Linea <SortIcon col="linea_desc" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 140, ...thStyle('familia_desc') }} onClick={() => ordenar('familia_desc')}>
                  Familia <SortIcon col="familia_desc" orden={orden} direccion={direccion} />
                </th>
                <th style={{ width: 70, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr
                  key={a.ite_item}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/articulos/${a.ite_item}`)}
                >
                  <td>
                    {a.ite_imag ? (
                      <img
                        src={`${IMG_BASE}${encodeURIComponent(a.ite_imag)}`}
                        alt=""
                        style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--borde)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: 30, height: 30, background: 'var(--fondo)', borderRadius: 4, border: '1px solid var(--borde)' }} />
                    )}
                  </td>
                  <td className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ite_item}</td>
                  <td style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ite_dsit}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.estado_desc || '-'}</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: a.saldo > 0 ? 'var(--verde)' : 'var(--rojo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatearSaldo(a.saldo)}
                  </td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ustock_abrev || '-'}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.linea_desc || '-'}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.familia_desc || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 6px', fontSize: 11, color: 'var(--primario)', background: 'transparent', fontWeight: 700 }}
                        title="Ver detalle"
                        onClick={(e) => { e.stopPropagation(); navigate(`/articulos/${a.ite_item}`); }}
                      >
                        <DocumentIcon size={15} />
                      </button>
                      {a.ite_imag && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 6px', fontSize: 11, color: 'var(--verde)', background: 'transparent', fontWeight: 700 }}
                          title="Ver imagen"
                          onClick={(e) => { e.stopPropagation(); setImagenModal({ src: `${IMG_BASE}${encodeURIComponent(a.ite_imag)}`, alt: a.ite_dsit }); }}
                        >
                          <ImageIcon size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaSegura <= 1} onClick={() => setPagina(paginaSegura - 1)}>
                ← Anterior
              </button>
              <span className="mutado">
                Pagina {paginaSegura} de {totalPaginas} · mostrando {visibles.length} de {filtrados.length}
              </span>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(paginaSegura + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {imagenModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setImagenModal(null)}
        >
          <div style={{ background: 'var(--tarjeta)', borderRadius: 12, padding: 16, maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImagenModal(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'var(--borde)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--texto)' }}
            >
              ×
            </button>
            <img src={imagenModal.src} alt={imagenModal.alt} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--texto-suave)' }}>{imagenModal.alt}</div>
          </div>
        </div>
      )}
    </div>
  );
}
