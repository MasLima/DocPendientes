import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import Exportar from '../components/Exportar';
import { EyeIcon } from '../components/Iconos';

const POR_PAGINA = 100;

export default function ClientesScreen() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [vendedorSel, setVendedorSel] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [anchoCliente, setAnchoCliente] = useState(280);

  // El vendedor ve solo su cartera: ocultamos columna y filtro de vendedor.
  const puedeTodos = user?.permisos?.includes('clientes.ver_todos') || false;

  const cargar = useCallback(async () => {
    try {
      const qs = vendedorSel ? `?vendedor=${encodeURIComponent(vendedorSel)}` : '';
      const data = await apiGet(`/clientes${qs}`, token);
      setClientes(Array.isArray(data) ? data : data.value || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, vendedorSel]);

  const cargarVendedores = useCallback(async () => {
    if (!puedeTodos) return;
    try {
      const data = await apiGet('/clientes/vendedores', token);
      setVendedores(Array.isArray(data) ? data : data.value || []);
    } catch { /* noop */ }
  }, [token, puedeTodos]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarVendedores(); }, [cargarVendedores]);

  // Filtrado en memoria (rapido incluso con 14k filas gracias a useMemo).
  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return clientes;
    return clientes.filter((c) =>
      (c.ter_deno || '').toLowerCase().includes(b) ||
      (c.ter_rucn || '').includes(b) ||
      (c.ter_cote || '').includes(b)
    );
  }, [clientes, busqueda]);

  // Paginacion: solo se pintan POR_PAGINA filas, la UI nunca se congela.
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA),
    [filtrados, paginaSegura]
  );

  // Volver a la pagina 1 al cambiar la busqueda o el vendedor.
  useEffect(() => { setPagina(1); }, [busqueda, vendedorSel]);

  // Redimension de la columna Cliente arrastrando el borde del encabezado.
  const empezarResize = (e) => {
    e.preventDefault();
    const inicioX = e.clientX;
    const inicioW = anchoCliente;
    const mover = (ev) => {
      const w = Math.min(600, Math.max(120, inicioW + (ev.clientX - inicioX)));
      setAnchoCliente(w);
    };
    const soltar = () => {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          Clientes <span className="mutado">({filtrados.length})</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {filtrados.length > 0 && (
            <Exportar
              nombreArchivo="clientes"
              columnas={['Código', 'Cliente', 'RUC', 'Teléfono', 'Cond. pago', ...(puedeTodos ? ['Vendedor'] : [])]}
              filas={filtrados.map((c) => [c.ter_cote, c.ter_deno || '', c.ter_rucn || '-', c.ter_fono || '-', c.cond_pago_desc || c.ter_cocp || '-', ...(puedeTodos ? [c.vendedor_nombre || c.ter_core || '-'] : [])])}
            />
          )}
          {puedeTodos && (
            <select className="input" style={{ width: 180 }} value={vendedorSel} onChange={(e) => setVendedorSel(e.target.value)}>
              <option value="">Todos los vendedores</option>
              {vendedores.map((v) => (
                <option key={v.ter_cote} value={v.ter_cote}>{v.ter_cote} - {v.ter_deno}</option>
              ))}
            </select>
          )}
          <div style={{ position: 'relative', width: 300 }}>
            <input
              className="input"
              style={{ width: '100%', paddingRight: 34 }}
              placeholder="Buscar por nombre, RUC o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                className="btn btn-ghost"
                title="Limpiar búsqueda"
                onClick={() => setBusqueda('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 0, width: 20, height: 20, fontSize: 14, lineHeight: 1, color: 'var(--texto-suave)' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="vacio">Cargando clientes...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : (
        <>
          <table className="tabla" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Código</th>
                <th style={{ width: anchoCliente, position: 'relative' }}>
                  Cliente
                  <span
                    onMouseDown={empezarResize}
                    title="Arrastrar para ajustar ancho"
                    style={{ position: 'absolute', top: 0, right: -4, width: 8, height: '100%', cursor: 'col-resize' }}
                  />
                </th>
                <th style={{ width: 110 }}>RUC</th>
                <th style={{ width: 120 }}>Teléfono</th>
                <th style={{ width: 150 }}>Cond. pago</th>
                {puedeTodos && <th style={{ width: 150 }}>Vendedor</th>}
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.ter_cote} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${c.ter_cote}`)}>
                  <td className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ter_cote}</td>
                  <td
                    title={c.ter_deno || 'Sin nombre'}
                    style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {c.ter_deno || 'Sin nombre'}
                  </td>
                  <td className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ter_rucn || '-'}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ter_fono || '-'}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cond_pago_desc || c.ter_cocp || '-'}</td>
                  {puedeTodos && <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.vendedor_nombre || c.ter_core || '-'}</td>}
                  <td>
                    <button
                      className="btn btn-verde"
                      style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.ter_cote}/incidencias`); }}
                    >
                      <EyeIcon size={14} /> Ver incidencias
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtrados.length === 0 && <div className="vacio">Sin resultados</div>}

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaSegura <= 1} onClick={() => setPagina(paginaSegura - 1)}>
                ← Anterior
              </button>
              <span className="mutado">
                Página {paginaSegura} de {totalPaginas} · mostrando {visibles.length} de {filtrados.length}
              </span>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)' }} disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(paginaSegura + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}