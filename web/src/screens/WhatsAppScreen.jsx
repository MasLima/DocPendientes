import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';
import { WhatsAppSendIcon, CheckIcon, CloseIcon, FilterIcon, WhatsAppIcon, FunnelIcon, PeopleIcon, BoxIcon, UploadIcon, ExcelIcon, PdfIcon, PlusIcon } from '../components/Iconos';
import CampoBusqueda from '../components/CampoBusqueda';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';
const PAGE_SIZE = 15;

function FiltroPopup({ titulo, items, seleccionados, onCambio, campoId, campoNombre, campoTelefono, colores, showTelefono = true, requerirTelefono = true, icono }) {
  const IconoFiltro = icono || FilterIcon;
  const [abierto, setAbierto] = useState(false);
  const [temp, setTemp] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef(null);
  const MAX_ITEMS = 50;

  useEffect(() => {
    const manejarClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    if (abierto) document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [abierto]);

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    const result = [];
    for (let i = 0; i < items.length && result.length < MAX_ITEMS; i++) {
      const d = items[i];
      const nombre = (d[campoNombre] || '').toLowerCase();
      const tel = campoTelefono ? (d[campoTelefono] || '').toLowerCase() : '';
      const id = (d[campoId] || '').toLowerCase();
      if (nombre.includes(b) || tel.includes(b) || id.includes(b)) result.push(d);
    }
    return result;
  }, [items, busqueda, campoNombre, campoTelefono, campoId]);

  const totalFiltrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return items.length;
    let count = 0;
    for (const d of items) {
      const nombre = (d[campoNombre] || '').toLowerCase();
      const tel = campoTelefono ? (d[campoTelefono] || '').toLowerCase() : '';
      const id = (d[campoId] || '').toLowerCase();
      if (nombre.includes(b) || tel.includes(b) || id.includes(b)) count++;
    }
    return count;
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
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 13, borderRadius: 6, border: `1px solid ${seleccionados.length > 0 ? colores : 'var(--borde)'}`, background: seleccionados.length > 0 ? colores + '15' : 'var(--fondo)', color: seleccionados.length > 0 ? colores : 'var(--texto)', cursor: 'pointer', fontWeight: seleccionados.length > 0 ? 700 : 400, width: '100%', justifyContent: 'space-between' }}>
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
            <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{temp.length} seleccionados{totalFiltrados > MAX_ITEMS ? ` / ${totalFiltrados} total` : ''}</span>
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
            {totalFiltrados > MAX_ITEMS && (
              <div style={{ padding: '6px', fontSize: 11, color: 'var(--texto-suave)', textAlign: 'center' }}>
                Mostrando {MAX_ITEMS} de {totalFiltrados}. Escribe para buscar más.
              </div>
            )}
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

export default function WhatsAppScreen() {
  const { token } = useAuth();
  const [estado, setEstado] = useState(null);
  const [qr, setQr] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [contactosWA, setContactosWA] = useState([]);

  const [clientesSel, setClientesSel] = useState([]);
  const [vendedoresSel, setVendedoresSel] = useState([]);
  const [empleadosSel, setEmpleadosSel] = useState([]);
  const [contactosWASel, setContactosWASel] = useState([]);
  const [articulosSel, setArticulosSel] = useState([]);
  const [archivosSel, setArchivosSel] = useState([]);
  const [telefonosAdicionales, setTelefonosAdicionales] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [alerta, setAlerta] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [pagHistorial, setPagHistorial] = useState(1);
  const [filtros, setFiltros] = useState({ fecha_inicio: '', fecha_fin: '', telefono_origen: '', telefono_destino: '', tipo: '' });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [colapsarEnviar, setColapsarEnviar] = useState(false);
  const [colapsarHistorial, setColapsarHistorial] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet('/clientes', token).then(d => setClientes(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/clientes/vendedores', token).then(d => setVendedores(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/whatsapp/empleados', token).then(d => setEmpleados(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/articulos', token).then(d => setArticulos(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/whatsapp/contactos', token).then(d => setContactosWA(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token]);

  const cargarEstado = useCallback(async () => {
    try {
      const est = await apiGet('/whatsapp/estado', token);
      setEstado(est);
      if (est.qrDisponible) { const qrData = await apiGet('/whatsapp/qr', token); setQr(qrData.qr); }
    } catch (err) { console.error(err); }
    finally { setCargando(false); }
  }, [token]);

  const reconectar = async () => {
    try { await apiPost('/whatsapp/conectar', {}, token); setTimeout(cargarEstado, 3000); } catch {}
  };

  useEffect(() => { cargarEstado(); }, [cargarEstado]);
  useEffect(() => {
    if (estado?.estado !== 'conectado') {
      const interval = setInterval(cargarEstado, 5000);
      return () => clearInterval(interval);
    }
  }, [estado?.estado, cargarEstado]);

  const cargarHistorial = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: pagHistorial, limit: PAGE_SIZE });
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.telefono_origen) params.append('telefono_origen', filtros.telefono_origen);
      if (filtros.telefono_destino) params.append('telefono_destino', filtros.telefono_destino);
      if (busquedaHistorial.trim()) params.append('busqueda', busquedaHistorial.trim());
      const data = await apiGet(`/whatsapp/historial?${params}`, token);
      setHistorial(data);
    } catch {}
  }, [token, pagHistorial, filtros, busquedaHistorial]);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

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

  const todosDestinos = [...clientesSel, ...vendedoresSel, ...empleadosSel, ...contactosWASel];

  const telAdicionales = useMemo(() => {
    if (!telefonosAdicionales.trim()) return [];
    return telefonosAdicionales.split(',').map(t => t.trim()).filter(t => t.length > 0).map(t => ({ ter_cell: t, ter_deno: t, _esTelefonoAdicional: true }));
  }, [telefonosAdicionales]);

  const todosDestinosConTel = [...todosDestinos, ...telAdicionales];

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const enviar = async () => {
    if (todosDestinosConTel.length === 0) return setAlerta({ tipo: 'info', texto: 'Selecciona al menos un destino o ingresa un teléfono' });
    if (archivosSel.length === 0 && articulosSel.length === 0 && !mensaje.trim()) return setAlerta({ tipo: 'info', texto: 'Escribe un mensaje o selecciona contenido' });
    setEnviando(true);
    let enviados = 0, fallidos = 0;
    try {
      for (const d of todosDestinosConTel) {
        const tel = d.ter_cell || d.ter_fono || d.telefono;
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
      setAlerta({ tipo: enviados > 0 ? 'exito' : 'error', texto: enviados > 0 ? `✓ Enviado a ${enviados} destino(s)${fallidos > 0 ? `, ${fallidos} sin número` : ''}` : 'No se pudo enviar.' });
      cargarHistorial();
    } catch (err) { setAlerta({ tipo: 'error', texto: err.message }); }
    finally { setEnviando(false); }
  };

  if (cargando) return <div style={{ padding: 20, fontSize: 14, color: 'var(--texto-suave)' }}>Cargando...</div>;

  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, background: 'var(--fondo)', border: '1px solid var(--borde)' };

  return (
    <div>
      <h2 style={{ margin: '0 0 14px', fontSize: 20 }}>WhatsApp</h2>

      {/* ═══════════════ SECCIÓN 1: CONEXIÓN / RECONEXIÓN ═══════════════ */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Conexión / Reconexión</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: estado?.estado === 'conectado' ? '#27ae60' : '#e74c3c', display: 'inline-block' }} />
            <span style={{ fontSize: 14, color: 'var(--texto)' }}>
              {estado?.estado === 'conectado' ? `Conectado: ${estado.conexion?.nombre} (+51${estado.conexion?.telefono})` : 'No conectado'}
            </span>
          </div>
          <button onClick={reconectar} style={{ padding: '8px 14px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--fondo)', cursor: 'pointer' }}>Reconectar</button>
        </div>
      </div>

      {/* QR */}
      {estado?.estado === 'esperando_qr' && qr && (
        <div className="card" style={{ marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', marginBottom: 8 }}>Escanea el código QR</div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`} alt="QR" style={{ width: 250, height: 250 }} />
          <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 8 }}>WhatsApp → Dispositivos vinculados → Vincular dispositivo</div>
        </div>
      )}
      {estado?.estado === 'esperando_qr' && !qr && (
        <div className="card" style={{ marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)' }}>Generando código QR...</div>
        </div>
      )}

      {/* ═══════════════ SECCIÓN 2: ENVIAR MENSAJES ═══════════════ */}
      {estado?.estado === 'conectado' && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setColapsarEnviar(!colapsarEnviar)}
                style={{ background: 'none', border: '1px solid var(--borde)', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>
                {colapsarEnviar ? '+' : '−'}
              </button>
              Enviar Mensajes
            </div>
          </div>

          {!colapsarEnviar && (<>
          {/* Estado de conexión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', background: 'var(--fondo)', borderRadius: 6, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
            <span style={{ color: 'var(--texto)' }}>Conectado: +51{estado.conexion?.telefono}</span>
          </div>

          {/* Header: título + botón enviar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>Enviar Mensaje</div>
            <button onClick={enviar} disabled={enviando || todosDestinosConTel.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 15, fontWeight: 700, background: '#25D366', border: 'none', color: '#fff', borderRadius: 8, cursor: enviando ? 'wait' : 'pointer', opacity: todosDestinosConTel.length === 0 ? 0.5 : 1 }}>
              <WhatsAppSendIcon size={22} />
              {enviando ? 'Enviando...' : `Enviar a ${todosDestinosConTel.length} destino(s)`}
            </button>
          </div>

          {/* Mensaje */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600 }}>Mensaje</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Escribe un mensaje..." rows={3}
              style={{ width: '100%', marginTop: 4, resize: 'vertical', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--fondo)' }} />
          </div>

          {/* Destino */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Destino</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <FiltroPopup titulo="Clientes" items={clientes} seleccionados={clientesSel} onCambio={setClientesSel}
                campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" colores="#3498db" icono={PeopleIcon} />
              <FiltroPopup titulo="Vendedores" items={vendedores} seleccionados={vendedoresSel} onCambio={setVendedoresSel}
                campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" colores="#e67e22" icono={PeopleIcon} />
              <FiltroPopup titulo="Empleados" items={empleados} seleccionados={empleadosSel} onCambio={setEmpleadosSel}
                campoId="ter_cote" campoNombre="nombre" campoTelefono="ter_cell" colores="#9b59b6" icono={PeopleIcon} />
              <FiltroPopup titulo="Contactos WhatsApp" items={contactosWA} seleccionados={contactosWASel} onCambio={setContactosWASel}
                campoId="telefono" campoNombre="nombre" campoTelefono="telefono" colores="#128C7E" icono={WhatsAppIcon} />
            </div>
            {(clientesSel.length > 0 || vendedoresSel.length > 0 || empleadosSel.length > 0 || contactosWASel.length > 0) && (
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
                {contactosWASel.map(c => (
                  <span key={c.telefono} style={{ ...chipStyle, borderColor: '#128C7E40' }}>
                    {c.nombre} <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{c.telefono}</span>
                    <button onClick={() => setContactosWASel(prev => prev.filter(x => x.telefono !== c.telefono))} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Artículos + Archivos + Teléfonos */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {/* Artículos - mitad de línea */}
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Artículos{articulosSel.length > 0 ? ` (${articulosSel.length})` : ''}</label>
                <FiltroPopup titulo="Artículos" items={articulos} seleccionados={articulosSel}
                  onCambio={(sel) => { setArticulosSel(sel); if (sel.length === 1) setMensaje(generarMensajeArticulo(sel[0])); else if (sel.length > 1) setMensaje(generarMensajeMultiple(sel)); }}
                  campoId="ite_item" campoNombre="ite_dsit" campoTelefono={null} colores="#27ae60" showTelefono={false} requerirTelefono={false} icono={BoxIcon} />
              </div>
              {/* Archivos + Teléfono */}
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Archivos{archivosSel.length > 0 ? ` (${archivosSel.length})` : ''}</label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 6, cursor: 'pointer', fontSize: 14, border: '1px solid #c8e6c9' }}>
                  <UploadIcon size={18} /> Seleccionar Archivo <input type="file" onChange={subirArchivo} style={{ display: 'none' }} accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.jpg,.jpeg,.png,.gif" />
                </label>
              </div>
            </div>
            {/* Chips de artículos y archivos */}
            {(articulosSel.length > 0 || archivosSel.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {articulosSel.map(a => (
                  <span key={a.ite_item} style={{ ...chipStyle, borderColor: '#27ae6040' }}>
                    {a.ite_dsit || a.ite_item}
                    <button onClick={() => toggleArticulo(a)} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                {archivosSel.map((a, i) => (
                  <span key={i} style={{ ...chipStyle, borderColor: '#e74c3c40' }}>
                    {a.nombre} <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{(a.tamano / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setArchivosSel(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--rojo)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            {/* Teléfonos adicionales */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--texto-suave)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Teléfonos adicionales</label>
              <input value={telefonosAdicionales} onChange={e => setTelefonosAdicionales(e.target.value)}
                placeholder="Ej: 923287233, 912345678, 998877665"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--fondo)', boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 4 }}>Separar con coma. Ej: 923287233, 912345678</div>
            </div>
          </div>
          </>)}
        </div>
      )}

      {/* ═══════════════ SECCIÓN 3: HISTORIAL DE ENVÍOS ═══════════════ */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primario)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setColapsarHistorial(!colapsarHistorial)}
              style={{ background: 'none', border: '1px solid var(--borde)', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>
              {colapsarHistorial ? '+' : '−'}
            </button>
            Historial de Envíos
          </div>
        </div>

        {!colapsarHistorial && (<>
        {/* Buscador rápido */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <CampoBusqueda value={busquedaHistorial} onChange={setBusquedaHistorial}
            placeholder="Buscar por Desde o Hacia..." width="300px" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{historial?.total || 0} envíos registrados</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, border: `1px solid ${mostrarFiltros ? 'var(--primario)' : 'var(--borde)'}`, background: mostrarFiltros ? 'var(--primario)15' : 'var(--fondo)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FilterIcon size={16} /> Filtros
            </button>
            <button onClick={() => {
              const colExp = ['Fecha', 'Desde', 'Hacia', 'Tipo', 'Estado'];
              const filExp = (historial?.datos || []).map(m => [
                new Date(m.fecha_envio).toLocaleString('es-PE'),
                `+51${m.telefono_origen || '?'}`,
                `+51${m.telefono}${m.cliente_nombre ? ` (${m.cliente_nombre})` : ''}`,
                m.tipo, m.estado
              ]);
              const ws = XLSX.utils.aoa_to_sheet([colExp, ...filExp]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Historial');
              XLSX.writeFile(wb, 'historial_whatsapp.xlsx');
            }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--verde)', color: '#fff', cursor: 'pointer' }}>
              <ExcelIcon size={14} /> Excel
            </button>
            <button onClick={() => {
              const colExp = ['Fecha', 'Desde', 'Hacia', 'Tipo', 'Estado'];
              const filExp = (historial?.datos || []).map(m => [
                new Date(m.fecha_envio).toLocaleString('es-PE'),
                `+51${m.telefono_origen || '?'}`,
                `+51${m.telefono}${m.cliente_nombre ? ` (${m.cliente_nombre})` : ''}`,
                m.tipo, m.estado
              ]);
              const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
              doc.setFontSize(14);
              doc.text('Historial de Envíos WhatsApp', 40, 30);
              autoTable(doc, { startY: 50, head: [colExp], body: filExp, styles: { fontSize: 8 }, headStyles: { fillColor: [26, 43, 76] } });
              doc.save('historial_whatsapp.pdf');
            }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--borde)', background: '#c0392b', color: '#fff', cursor: 'pointer' }}>
              <PdfIcon size={14} /> PDF
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div style={{ marginBottom: 10, padding: 12, background: 'var(--fondo)', borderRadius: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha inicio</label>
                <input type="date" value={filtros.fecha_inicio} onChange={e => setFiltros(f => ({ ...f, fecha_inicio: e.target.value }))} style={{ fontSize: 13, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--borde)' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha fin</label>
                <input type="date" value={filtros.fecha_fin} onChange={e => setFiltros(f => ({ ...f, fecha_fin: e.target.value }))} style={{ fontSize: 13, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--borde)' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Origen</label>
                <input value={filtros.telefono_origen} onChange={e => setFiltros(f => ({ ...f, telefono_origen: e.target.value }))} placeholder="Tel. origen" style={{ fontSize: 13, padding: '6px 8px', width: 120, borderRadius: 4, border: '1px solid var(--borde)' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Destino</label>
                <input value={filtros.telefono_destino} onChange={e => setFiltros(f => ({ ...f, telefono_destino: e.target.value }))} placeholder="Tel. destino" style={{ fontSize: 13, padding: '6px 8px', width: 120, borderRadius: 4, border: '1px solid var(--borde)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setFiltros({ fecha_inicio: '', fecha_fin: '', telefono_origen: '', telefono_destino: '', tipo: '' }); setPagHistorial(1); }}
                disabled={!filtros.fecha_inicio && !filtros.fecha_fin && !filtros.telefono_origen && !filtros.telefono_destino && !filtros.tipo}
                style={{ padding: '6px 14px', fontSize: 13, borderRadius: 6, border: '1px solid var(--borde)', background: '#fff', cursor: 'pointer', opacity: (!filtros.fecha_inicio && !filtros.fecha_fin && !filtros.telefono_origen && !filtros.telefono_destino && !filtros.tipo) ? 0.5 : 1 }}>
                Limpiar
              </button>
            </div>
          </div>
        )}

        {historial?.datos?.length > 0 ? (
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Desde</th><th>Hacia</th><th>Tipo</th><th>Estado</th></tr></thead>
            <tbody>
              {historial.datos.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{new Date(m.fecha_envio).toLocaleString('es-PE')}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>+51{m.telefono_origen || '?'}</td>
                  <td style={{ fontSize: 12 }}>
                    <span style={{ fontFamily: 'monospace' }}>+51{m.telefono}</span>
                    {m.cliente_nombre && <span style={{ color: 'var(--texto-suave)', marginLeft: 4 }}>({m.cliente_nombre})</span>}
                  </td>
                  <td><span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--fondo)' }}>{m.tipo}</span></td>
                  <td style={{ color: m.estado === 'enviado' ? 'var(--verde)' : 'var(--rojo)' }}>{m.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 20, fontSize: 13, color: 'var(--texto-suave)', textAlign: 'center' }}>Sin envíos registrados</div>
        )}
        {historial?.total > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10 }}>
            <button disabled={pagHistorial <= 1} onClick={() => setPagHistorial(p => p - 1)} style={{ padding: '4px 10px', border: '1px solid var(--borde)', borderRadius: 4, background: 'var(--fondo)', cursor: 'pointer' }}>←</button>
            <span style={{ fontSize: 13, color: 'var(--texto-suave)', alignSelf: 'center' }}>Página {pagHistorial} de {Math.ceil(historial.total / PAGE_SIZE)}</span>
            <button disabled={pagHistorial * PAGE_SIZE >= historial.total} onClick={() => setPagHistorial(p => p + 1)} style={{ padding: '4px 10px', border: '1px solid var(--borde)', borderRadius: 4, background: 'var(--fondo)', cursor: 'pointer' }}>→</button>
          </div>
        )}
        </>)}
      </div>

      {/* ═══════════════ ALERTA MODAL ═══════════════ */}
      {alerta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--tarjeta)', borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 420, textAlign: 'center', border: '1px solid var(--borde)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ marginBottom: 12 }}>
              {alerta.tipo === 'exito' && <span style={{ fontSize: 48, color: '#27ae60' }}>✓</span>}
              {alerta.tipo === 'error' && <span style={{ fontSize: 48, color: '#e74c3c' }}>✗</span>}
              {alerta.tipo === 'info' && <span style={{ fontSize: 48, color: 'var(--primario)' }}>ℹ</span>}
            </div>
            <div style={{ fontSize: 15, color: 'var(--texto)', marginBottom: 20, lineHeight: 1.5 }}>{alerta.texto}</div>
            <button onClick={() => setAlerta(null)}
              style={{ padding: '10px 30px', fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', background: alerta.tipo === 'exito' ? '#27ae60' : alerta.tipo === 'error' ? '#e74c3c' : 'var(--primario)', color: '#fff', cursor: 'pointer' }}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
