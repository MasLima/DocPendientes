import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiGet, apiPost } from '../api/client';
import { CloseIcon, WhatsAppIcon, WhatsAppSendIcon, FilterIcon, CheckIcon, PeopleIcon, BoxIcon, UploadIcon } from './Iconos';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';

function FiltroPopup({ titulo, items, seleccionados, onCambio, campoId, campoNombre, campoTelefono, colores, showTelefono = true, requerirTelefono = true, icono }) {
  const IconoFiltro = icono || FilterIcon;
  const [abierto, setAbierto] = useState(false);
  const [temp, setTemp] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const manejarClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return items.filter(d => {
      const nombre = (d[campoNombre] || '').toLowerCase();
      const tel = campoTelefono ? (d[campoTelefono] || '').toLowerCase() : '';
      const id = (d[campoId] || '').toLowerCase();
      return nombre.includes(b) || tel.includes(b) || id.includes(b);
    });
  }, [items, busqueda, campoNombre, campoTelefono, campoId]);

  const abrir = () => { setTemp([...seleccionados]); setBusqueda(''); setAbierto(true); };
  const toggle = (item) => {
    const tel = campoTelefono ? item[campoTelefono] : 'ok';
    const sinTel = requerirTelefono && (!tel || tel.trim() === '');
    if (sinTel) return;
    const id = item[campoId];
    setTemp(prev => prev.find(x => x[campoId] === id) ? prev.filter(x => x[campoId] !== id) : [...prev, item]);
  };
  const aplicar = () => { onCambio(temp); setAbierto(false); };
  const cancelar = () => { setAbierto(false); };
  const limpiar = () => { setTemp([]); };

  return (
    <div style={{ position: 'relative', flex: 1 }} ref={ref}>
      <button onClick={() => abierto ? setAbierto(false) : abrir()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, borderRadius: 6, border: `1px solid ${seleccionados.length > 0 ? colores : 'var(--borde)'}`, background: seleccionados.length > 0 ? colores + '15' : 'var(--fondo)', color: seleccionados.length > 0 ? colores : 'var(--texto)', cursor: 'pointer', fontWeight: seleccionados.length > 0 ? 700 : 400, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconoFiltro size={16} />
          {titulo}{seleccionados.length > 0 ? ` (${seleccionados.length})` : ''}
        </span>
        <span style={{ fontSize: 10 }}>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 6, width: 400, padding: 10, background: 'var(--tarjeta)', border: '1px solid var(--borde)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, código o teléfono..."
            style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{temp.length} seleccionados</span>
            {temp.length > 0 && (
              <button onClick={limpiar} style={{ fontSize: 12, padding: '2px 6px', border: 'none', background: 'none', color: 'var(--rojo)', cursor: 'pointer' }}>Limpiar</button>
            )}
          </div>

          <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 4, borderTop: '1px solid var(--borde)', paddingTop: 4 }}>
            {filtrados.map(d => {
              const tel = campoTelefono ? d[campoTelefono] : 'ok';
              const sinTel = requerirTelefono && (!tel || tel.trim() === '');
              const estaSel = temp.find(x => x[campoId] === d[campoId]);
              return (
                <label key={d[campoId]} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: sinTel ? 'not-allowed' : 'pointer', fontSize: 13, opacity: sinTel ? 0.4 : 1, background: estaSel ? '#eef3fb' : 'transparent', borderRadius: 4 }}>
                  <input type="checkbox" checked={!!estaSel} disabled={sinTel} onChange={() => toggle(d)} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d[campoNombre]}</span>
                  {showTelefono && <span style={{ color: 'var(--texto-suave)', fontSize: 11, whiteSpace: 'nowrap' }}>{sinTel ? 'Sin WhatsApp' : tel}</span>}
                </label>
              );
            })}
            {filtrados.length === 0 && <div style={{ padding: '8px 6px', fontSize: 13, color: 'var(--texto-suave)' }}>Sin resultados</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid var(--borde)', paddingTop: 10 }}>
            <button onClick={aplicar} style={{ flex: 1, padding: '8px 10px', fontSize: 13, borderRadius: 6, border: 'none', background: 'var(--primario)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckIcon size={16} /> Aplicar
            </button>
            <button onClick={cancelar} style={{ flex: 1, padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #f5c6cb', background: '#fde9ec', color: '#c0392b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CloseIcon size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppModal({ abierto, onClose, token, cliente, articulo }) {
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [articulos, setArticulos] = useState([]);

  const [clientesSel, setClientesSel] = useState([]);
  const [vendedoresSel, setVendedoresSel] = useState([]);
  const [empleadosSel, setEmpleadosSel] = useState([]);
  const [articulosSel, setArticulosSel] = useState([]);
  const [archivosSel, setArchivosSel] = useState([]);
  const [telefonosAdicionales, setTelefonosAdicionales] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [telefonoRemitente, setTelefonoRemitente] = useState('');

  const [contactosWA, setContactosWA] = useState([]);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [mostrarContactos, setMostrarContactos] = useState(false);
  const [cargandoContactos, setCargandoContactos] = useState(false);

  useEffect(() => {
    if (!abierto || !token) return;
    apiGet('/whatsapp/estado', token).then(est => {
      setTelefonoRemitente(est?.conexion?.telefono || '');
    }).catch(() => {});
  }, [abierto, token]);

  useEffect(() => {
    if (!abierto) return;
    setResultado(null);
    setArchivosSel([]);
    setContactosWA([]);
    setBusquedaContacto('');
    setMostrarContactos(false);

    if (articulo) {
      setArticulosSel([articulo]);
      setClientesSel([]);
      setVendedoresSel([]);
      setEmpleadosSel([]);
      setMensaje(generarMensajeArticulo(articulo));
    } else if (cliente) {
      setClientesSel([cliente]);
      setArticulosSel([]);
      setVendedoresSel([]);
      setEmpleadosSel([]);
      setMensaje('');
    } else {
      setClientesSel([]);
      setArticulosSel([]);
      setVendedoresSel([]);
      setEmpleadosSel([]);
      setMensaje('');
    }
  }, [abierto, cliente, articulo]);

  useEffect(() => {
    if (!abierto || !token) return;
    apiGet('/clientes', token).then(d => setClientes(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/clientes/vendedores', token).then(d => setVendedores(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/whatsapp/empleados', token).then(d => setEmpleados(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/articulos', token).then(d => setArticulos(Array.isArray(d) ? d : [])).catch(() => {});
  }, [abierto, token]);

  const generarMensajeArticulo = (art) => {
    const l = [];
    l.push(`🏷 *${art.ite_dsit || art.ite_item}*`);
    l.push(`Código: ${art.ite_item}`);
    if (art.linea_desc) l.push(`Línea: ${art.linea_desc}`);
    if (art.familia_desc) l.push(`Familia: ${art.familia_desc}`);
    if (art.saldo != null) l.push(`Saldo: ${art.saldo} ${art.ustock_abrev || ''}`);
    if (art.ite_pruv) l.push(`Precio: S/. ${Number(art.ite_pruv).toFixed(2)}`);
    return l.join('\n');
  };

  const generarMensajeMultiple = (arts) => {
    const l = ['📦 *Catálogo de Productos*\n'];
    arts.forEach((a, i) => {
      const p = a.ite_pruv ? `S/. ${Number(a.ite_pruv).toFixed(2)}` : '';
      const s = a.saldo != null ? `${a.saldo} ${a.ustock_abrev || ''}` : '';
      l.push(`${i + 1}. *${a.ite_dsit || a.ite_item}*`);
      l.push(`   Código: ${a.ite_item}${p ? ` | ${p}` : ''}${s ? ` | Stock: ${s}` : ''}`);
    });
    return l.join('\n');
  };

  const toggleArticulo = (a) => {
    setArticulosSel(prev => {
      const existe = prev.find(x => x.ite_item === a.ite_item);
      const nueva = existe ? prev.filter(x => x.ite_item !== a.ite_item) : [...prev, a];
      if (nueva.length === 1) setMensaje(generarMensajeArticulo(nueva[0]));
      else if (nueva.length > 1) setMensaje(generarMensajeMultiple(nueva));
      return nueva;
    });
  };

  const buscarContactosWA = async (q) => {
    setBusquedaContacto(q);
    if (q.length < 2) return;
    setCargandoContactos(true);
    try {
      const data = await apiGet(`/whatsapp/contactos?q=${encodeURIComponent(q)}`, token);
      setContactosWA(Array.isArray(data) ? data : []);
      setMostrarContactos(true);
    } catch { setContactosWA([]); }
    finally { setCargandoContactos(false); }
  };

  const seleccionarContactoWA = (c) => {
    setMensaje(prev => prev || `Hola ${c.nombre},`);
    setMostrarContactos(false);
    setBusquedaContacto('');
  };

  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('archivo', file);
    try {
      const res = await fetch(`${window.location.origin}/api/whatsapp/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      if (data.ruta) setArchivosSel(prev => [...prev, { nombre: data.nombre, ruta: data.ruta, tamano: data.tamano }]);
    } catch (err) { alert('Error subiendo archivo: ' + err.message); }
  };

  const esArticulo = !!articulo;
  const esCliente = !!cliente;

  const telAdicionales = React.useMemo(() => {
    return telefonosAdicionales.split(',').map(t => t.trim()).filter(t => t.length > 0).map(t => ({ ter_cell: t, ter_deno: t, _esTelefonoAdicional: true }));
  }, [telefonosAdicionales]);

  const todosDestinos = esCliente
    ? [...vendedoresSel, ...empleadosSel, ...telAdicionales]
    : [...clientesSel, ...vendedoresSel, ...empleadosSel, ...telAdicionales];

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const enviar = async () => {
    if (esCliente) {
      const tel = cliente.ter_cell || cliente.ter_fono;
      if (!tel) return setResultado({ ok: false, texto: 'El cliente no tiene teléfono' });
      if (archivosSel.length === 0 && articulosSel.length === 0 && !mensaje.trim()) return setResultado({ ok: false, texto: 'Escribe un mensaje o selecciona contenido' });
      setEnviando(true); setResultado(null);
      try {
        if (articulosSel.length > 0) {
          for (let i = 0; i < articulosSel.length; i++) {
            const a = articulosSel[i];
            if (i > 0) await delay(2000);
            if (articulosSel.length === 1) {
              await apiPost('/whatsapp/enviar-articulo', { telefono: tel, articulo: a, cliente, mensaje }, token);
            } else {
              if (a.ite_imag) await apiPost('/whatsapp/enviar-mixto', { telefono: tel, imagenUrl: `${IMG_BASE}${encodeURIComponent(a.ite_imag)}`, mensaje: `🏷 *${a.ite_dsit || a.ite_item}*\nCódigo: ${a.ite_item}` }, token);
              else await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje: `🏷 *${a.ite_dsit || a.ite_item}*\nCódigo: ${a.ite_item}` }, token);
            }
          }
        } else if (archivosSel.length > 0) {
          await apiPost('/whatsapp/enviar-mixto', { telefono: tel, mensaje, archivos: archivosSel.map(a => a.ruta) }, token);
        } else {
          await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje }, token);
        }
        setResultado({ ok: true, texto: `✓ Enviado a ${cliente.ter_deno}` });
      } catch (err) { setResultado({ ok: false, texto: err.message }); }
      finally { setEnviando(false); }
    } else {
      if (todosDestinos.length === 0) return setResultado({ ok: false, texto: 'Selecciona al menos un destino' });
      if (archivosSel.length === 0 && articulosSel.length === 0 && !mensaje.trim()) return setResultado({ ok: false, texto: 'Escribe un mensaje o selecciona contenido' });
      setEnviando(true); setResultado(null);
      let enviados = 0, fallidos = 0;
      try {
        for (const d of todosDestinos) {
          const tel = d.ter_cell || d.ter_fono;
          if (!tel) { fallidos++; continue; }
          try {
            if (articulosSel.length > 0) {
              for (let i = 0; i < articulosSel.length; i++) {
                const a = articulosSel[i];
                if (i > 0) await delay(2000);
                if (articulosSel.length === 1) {
                  await apiPost('/whatsapp/enviar-articulo', { telefono: tel, articulo: a, cliente: d, mensaje }, token);
                } else {
                  if (a.ite_imag) await apiPost('/whatsapp/enviar-mixto', { telefono: tel, imagenUrl: `${IMG_BASE}${encodeURIComponent(a.ite_imag)}`, mensaje: `🏷 *${a.ite_dsit || a.ite_item}*\nCódigo: ${a.ite_item}` }, token);
                  else await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje: `🏷 *${a.ite_dsit || a.ite_item}*\nCódigo: ${a.ite_item}` }, token);
                }
              }
            } else if (archivosSel.length > 0) {
              await apiPost('/whatsapp/enviar-mixto', { telefono: tel, mensaje, archivos: archivosSel.map(a => a.ruta) }, token);
            } else {
              await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje }, token);
            }
            enviados++;
          } catch { fallidos++; }
        }
        setResultado({ ok: enviados > 0, texto: enviados > 0 ? `✓ Enviado a ${enviados} destino(s)${fallidos > 0 ? `, ${fallidos} sin número` : ''}` : 'No se pudo enviar.' });
      } catch (err) { setResultado({ ok: false, texto: err.message }); }
      finally { setEnviando(false); }
    }
  };

  if (!abierto) return null;

  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, background: 'var(--fondo)', border: '1px solid var(--borde)' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--tarjeta)', borderRadius: 12, width: '90%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--borde)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--borde)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <WhatsAppIcon size={24} />
            WhatsApp {esCliente ? `→ ${cliente.ter_deno}` : articulo ? `→ ${articulo.ite_dsit}` : ''}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto)' }}><CloseIcon size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Teléfono remitente */}
          {telefonoRemitente && (
            <div style={{ marginBottom: 10, padding: '6px 10px', background: 'var(--fondo)', borderRadius: 6, fontSize: 13, color: 'var(--texto-suave)' }}>
              Enviando desde: <strong style={{ color: 'var(--texto)' }}>+51{telefonoRemitente}</strong>
            </div>
          )}

          {/* Mensaje */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Mensaje</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Escribe un mensaje..." rows={3}
              style={{ width: '100%', marginTop: 4, resize: 'vertical', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--fondo)', boxSizing: 'border-box' }} />
          </div>

          {/* Resultado */}
          {resultado && (
            <div style={{ padding: 10, borderRadius: 6, marginBottom: 10, background: resultado.ok ? '#d4edda' : '#f8d7da', color: resultado.ok ? '#155724' : '#721c24', fontSize: 13 }}>
              {resultado.texto}
            </div>
          )}

          {/* Filtros */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {!esCliente && (
                <FiltroPopup titulo="Clientes" items={clientes} seleccionados={clientesSel} onCambio={setClientesSel}
                  campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" colores="#3498db" icono={PeopleIcon} />
              )}
              {!esCliente && (
                <FiltroPopup titulo="Vendedores" items={vendedores} seleccionados={vendedoresSel} onCambio={setVendedoresSel}
                  campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" colores="#e67e22" icono={PeopleIcon} />
              )}
              {!esCliente && (
                <FiltroPopup titulo="Empleados" items={empleados} seleccionados={empleadosSel} onCambio={setEmpleadosSel}
                  campoId="ter_cote" campoNombre="nombre" campoTelefono="ter_cell" colores="#9b59b6" icono={PeopleIcon} />
              )}
            </div>

            {/* Chips de seleccionados */}
            {!esCliente && (clientesSel.length > 0 || vendedoresSel.length > 0 || empleadosSel.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {clientesSel.map(c => (
                  <span key={c.ter_cote} style={{ ...chipStyle, borderColor: '#3498db40' }}>
                    {c.ter_deno} <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{c.ter_cell}</span>
                    <button onClick={() => setClientesSel(prev => prev.filter(x => x.ter_cote !== c.ter_cote))} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                {vendedoresSel.map(v => (
                  <span key={v.ter_cote} style={{ ...chipStyle, borderColor: '#e67e2240' }}>
                    {v.ter_deno} <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{v.ter_cell}</span>
                    <button onClick={() => setVendedoresSel(prev => prev.filter(x => x.ter_cote !== v.ter_cote))} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                {empleadosSel.map(e => (
                  <span key={e.ter_cote} style={{ ...chipStyle, borderColor: '#9b59b640' }}>
                    {e.nombre} <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{e.ter_cell}</span>
                    <button onClick={() => setEmpleadosSel(prev => prev.filter(x => x.ter_cote !== e.ter_cote))} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Artículos (solo para clientes) */}
          {esCliente && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Artículos{articulosSel.length > 0 ? ` (${articulosSel.length})` : ''}</label>
              <FiltroPopup titulo="Artículos" items={articulos} seleccionados={articulosSel}
                onCambio={(sel) => { setArticulosSel(sel); if (sel.length === 1) setMensaje(generarMensajeArticulo(sel[0])); else if (sel.length > 1) setMensaje(generarMensajeMultiple(sel)); }}
                campoId="ite_item" campoNombre="ite_dsit" campoTelefono={null} colores="#27ae60" showTelefono={false} requerirTelefono={false} icono={BoxIcon} />
              {articulosSel.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {articulosSel.map(a => (
                    <span key={a.ite_item} style={{ ...chipStyle, borderColor: '#27ae6040' }}>
                      {a.ite_dsit || a.ite_item}
                      <button onClick={() => toggleArticulo(a)} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Archivos */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Archivos{archivosSel.length > 0 ? ` (${archivosSel.length})` : ''}</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 6, cursor: 'pointer', fontSize: 14, border: '1px solid #c8e6c9' }}>
              <UploadIcon size={18} /> Seleccionar Archivo <input type="file" onChange={subirArchivo} style={{ display: 'none' }} accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.jpg,.jpeg,.png,.gif" />
            </label>
            {archivosSel.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {archivosSel.map((a, i) => (
                  <span key={i} style={{ ...chipStyle, borderColor: '#e74c3c40' }}>
                    {a.nombre} <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{(a.tamano / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setArchivosSel(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Teléfonos adicionales */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Teléfonos adicionales</label>
            <input value={telefonosAdicionales} onChange={e => setTelefonosAdicionales(e.target.value)}
              placeholder="Ej: 923287233, 912345678, 998877665"
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--fondo)', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 4 }}>Separar con coma. Ej: 923287233, 912345678</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--borde)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, borderRadius: 6, border: '1px solid #f5c6cb', background: '#fde9ec', color: '#c0392b', cursor: 'pointer', fontWeight: 600 }}>
            <CloseIcon size={16} /> Cancelar
          </button>
          <button onClick={enviar} disabled={enviando || (esCliente ? false : todosDestinos.length === 0)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, background: '#25D366', border: 'none', color: '#fff', borderRadius: 8, cursor: enviando ? 'wait' : 'pointer', opacity: (esCliente ? false : todosDestinos.length === 0) ? 0.5 : 1 }}>
            <WhatsAppSendIcon size={20} />
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
