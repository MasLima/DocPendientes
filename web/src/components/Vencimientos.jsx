import React, { useState, useEffect } from 'react';
import { apiPost, apiPut, apiDelete } from '../api/client';
import { SettingsIcon, BoldCheckIcon, CloseIcon, WhatsAppSendIcon, UndoIcon } from './Iconos';

function fmt(v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtFecha(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// ===================== VencimientosTab =====================
export function VencimientosTab({ vencimientos, vencError, rangoExpandido, setRangoExpandido, docsSeleccionados, setDocsSeleccionados, onEnviarWhatsApp, cargando, configRangos, setModalConfig, setEditandoRango, tiposDoc, tipoDocSel, setTipoDocSel, puedeConfigurar }) {
  if (cargando) return <div className="vacio">Cargando vencimientos...</div>;
  if (vencError) return <div className="vacio" style={{ color: 'var(--rojo)' }}>Error: {vencError}</div>;
  if (!vencimientos || !vencimientos.rangos) return <div className="vacio">Sin datos de vencimientos</div>;

  const { rangos, total } = vencimientos;
  const rangoKeys = Object.keys(rangos);

  const toggleRango = (nombre) => {
    setRangoExpandido(rangoExpandido === nombre ? null : nombre);
    setDocsSeleccionados([]);
  };

  const toggleDoc = (key) => {
    setDocsSeleccionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const seleccionarTodos = (nombre) => {
    const docs = rangos[nombre]?.documentos || [];
    const keys = docs.map(d => `${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`);
    const todosMarcados = keys.every(k => docsSeleccionados.includes(k));
    setDocsSeleccionados(todosMarcados ? docsSeleccionados.filter(k => !keys.includes(k)) : [...docsSeleccionados, ...keys.filter(k => !docsSeleccionados.includes(k))]);
  };

  const agruparPorCliente = (docs) => {
    const map = {};
    docs.forEach(d => {
      if (!map[d.ter_cote]) map[d.ter_cote] = { nombre: d.cliente_nombre, telefono: d.ter_cell || d.ter_fono || '', documentos: [] };
      map[d.ter_cote].documentos.push(d);
    });
    return Object.entries(map);
  };

  const seleccionadosDelRango = rangoExpandido
    ? (rangos[rangoExpandido]?.documentos || []).filter(d => docsSeleccionados.includes(`${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`))
    : [];

  const clientesSeleccionados = seleccionadosDelRango.reduce((acc, d) => {
    const cote = d.cob_cote;
    if (!acc[cote]) acc[cote] = { nombre: d.cliente_nombre, telefono: d.ter_cell || d.ter_fono || '', documentos: [] };
    acc[cote].documentos.push(d);
    return acc;
  }, {});

  const colorPorRango = (desde, hasta) => {
    if (hasta < 0) return 'var(--celeste)';
    if (desde === 0) return 'var(--warning)';
    return 'var(--rojo)';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select
            className="input"
            style={{ height: 36, fontSize: 13, width: 'auto', minWidth: 240, maxWidth: 340 }}
            value={tipoDocSel}
            onChange={(e) => setTipoDocSel(e.target.value)}
            title="Filtrar por tipo de documento"
          >
            <option value="">Todos los tipos de documento</option>
            {(tiposDoc || []).map((t) => (
              <option key={t.cob_codo} value={t.cob_codo}>{t.doc_descripcion || t.cob_codo}</option>
            ))}
          </select>
          <div className="mutado">
            Total: {total.cantidad} documentos · S/ {fmt(total.saldo_pen)} · Evaluado al {fmtFecha(new Date())}
          </div>
        </div>
        {puedeConfigurar && (
          <button
            className="btn btn-ghost"
            style={{ border: '1px solid var(--borde)', display: 'flex', alignItems: 'center', gap: 6, height: 36 }}
            onClick={() => setModalConfig(true)}
          >
            <SettingsIcon size={20} /> Configurar rangos
          </button>
        )}
      </div>

      {rangoKeys.length === 0 && <div className="vacio">No hay rangos de vencimiento configurados</div>}

      {rangoKeys.map(nombre => {
        const r = rangos[nombre];
        const expandido = rangoExpandido === nombre;
        const docs = r.documentos || [];
        const enviadosCount = docs.filter(d => d.enviado).length;

        return (
          <div key={nombre} style={{ marginBottom: 10 }}>
            <div
              onClick={() => toggleRango(nombre)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                background: expandido ? 'var(--active)' : 'var(--tarjeta)',
                border: `1px solid ${expandido ? colorPorRango(r.dias_desde, r.dias_hasta) : 'var(--borde)'}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorPorRango(r.dias_desde, r.dias_hasta) }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.etiqueta}</div>
                  <div className="mutado" style={{ fontSize: 12 }}>
                    {r.dias_desde === r.dias_hasta
                      ? `Día ${r.dias_desde}`
                      : `${r.dias_desde} a ${r.dias_hasta} días`
                    }
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{r.cantidad}</div>
                  <div className="mutado" style={{ fontSize: 12 }}>S/ {fmt(r.saldo_pen)}</div>
                </div>
                {enviadosCount > 0 && (
                  <span style={{ background: '#d5f5e3', color: '#1e8449', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    ✓ {enviadosCount} enviados
                  </span>
                )}
                <span style={{ fontSize: 18, color: 'var(--mutado)', transition: 'transform 0.2s', transform: expandido ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
              </div>
            </div>

            {expandido && docs.length > 0 && (
              <div style={{ marginTop: 4, border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--fondo)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={docs.every(d => docsSeleccionados.includes(`${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`))}
                      onChange={() => seleccionarTodos(nombre)}
                    />
                    Seleccionar todos ({docs.length})
                  </label>
                  {docsSeleccionados.length > 0 && (
                    <button
                      className="btn"
                      style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, height: 34, fontSize: 13 }}
                      onClick={() => {
                        const clientes = {};
                        seleccionadosDelRango.forEach(d => {
                          const cote = d.cob_cote;
                          if (!clientes[cote]) clientes[cote] = { ter_cote: cote, nombre: d.cliente_nombre, telefono: d.ter_cell || d.ter_fono || '', documentos: [] };
                          clientes[cote].documentos.push(d);
                        });
                        onEnviarWhatsApp(Object.values(clientes));
                      }}
                    >
                      <WhatsAppSendIcon size={14} /> Enviar WhatsApp ({docsSeleccionados.length} docs, {Object.keys(clientesSeleccionados).length} clientes)
                    </button>
                  )}
                </div>

                <table className="tabla">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th>Documento</th>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                      <th>Vence</th>
                      <th>Días</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(d => {
                      const key = `${d.cob_tivo}|${d.cob_nuvo}|${d.cob_codo}|${d.cob_seri}|${d.cob_nums}`;
                      const marcado = docsSeleccionados.includes(key);
                      return (
                        <tr key={key} style={{ opacity: d.enviado ? 0.5 : 1, background: marcado ? 'var(--active)' : undefined }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={d.enviado}
                              onChange={() => toggleDoc(key)}
                            />
                          </td>
                          <td className="mono" style={{ fontWeight: 600 }}>{d.cob_codo}-{d.cob_seri}-{d.cob_nums}</td>
                          <td style={{ fontWeight: 600 }}>{d.cliente_nombre}</td>
                          <td className="mono">{d.ter_cell || d.ter_fono || '-'}</td>
                          <td className="mono">{d.fecha_vencimiento ? fmtFecha(new Date(d.fecha_vencimiento)) : '-'}</td>
                          <td className="mono">{d.dias_vencido}</td>
                          <td className="mono" style={{ color: 'var(--verde)', fontWeight: 700 }}>S/ {fmt(d.saldo)}</td>
                          <td>
                            {d.enviado
                              ? <span style={{ color: '#1e8449', fontWeight: 700, fontSize: 12 }}>✓ Enviado</span>
                              : <span style={{ color: 'var(--mutado)', fontSize: 12 }}>Pendiente</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {expandido && docs.length === 0 && (
              <div className="vacio" style={{ marginTop: 8 }}>No hay documentos en este rango</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===================== ModalEnvioVencimiento =====================
export function ModalEnvioVencimiento({ clientes, rango, mensajeTemplate, onClose, onEnviado, token }) {
  const [resultados, setResultados] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [clienteActual, setClienteActual] = useState(0);
  const [telefonoEditado, setTelefonoEditado] = useState({});

  const totalDocs = clientes.reduce((s, c) => s + c.documentos.length, 0);
  const totalSaldo = clientes.reduce((s, c) => s + c.documentos.reduce((s2, d) => s2 + Number(d.saldo), 0), 0);

  const getTelefono = (c) => telefonoEditado[c.ter_cote] || c.telefono || '';

  const buildMensaje = (c) => {
    const d = c.documentos[0];
    const moneda = d.cob_como === 'USD' ? 'US$' : 'S/';
    const docLineas = c.documentos.map(doc => {
      const fecha = doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento).toLocaleDateString('es-PE') : '-';
      const dias = Math.abs(doc.dias_vencido);
      const monDoc = doc.cob_como === 'USD' ? 'US$' : 'S/';
      return `\u2022 ${doc.cob_codo}-${doc.cob_seri}-${doc.cob_nums} | Vence: ${fecha} | ${dias} d\u00edas | ${monDoc} ${Number(doc.saldo).toFixed(2)}`;
    }).join('\n');
    const total = c.documentos.reduce((s, doc) => s + Number(doc.saldo), 0);
    const tipoDoc = d.cob_codo || '';
    const fecha = d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-PE') : '-';

    let msg = mensajeTemplate
      .replace(/{nombre}/g, c.nombre)
      .replace(/{doc}/g, `${tipoDoc}-${d.cob_seri}-${d.cob_nums}`)
      .replace(/{fecha}/g, fecha)
      .replace(/{dias}/g, Math.abs(d.dias_vencido))
      .replace(/{saldo}/g, Number(d.saldo).toFixed(2))
      .replace(/{moneda}/g, moneda);

    if (c.documentos.length > 1) {
      msg += `\n\nDocumentos pendientes en este rango:\n${docLineas}\n\n*Total pendiente: ${moneda} ${total.toFixed(2)}*`;
    }
    return msg;
  };

  const enviar = async () => {
    setEnviando(true);
    setResultados([]);
    for (let i = 0; i < clientes.length; i++) {
      const c = clientes[i];
      setClienteActual(i);
      const tel = getTelefono(c);
      try {
        const payload = c.documentos.map(d => ({
          ter_cote: c.ter_cote,
          cliente_nombre: c.nombre,
          cob_tivo: d.cob_tivo,
          cob_nuvo: d.cob_nuvo,
          cob_codo: d.cob_codo,
          cob_seri: d.cob_seri,
          cob_nums: d.cob_nums,
          saldo: d.saldo,
          fecha_vencimiento: d.fecha_vencimiento,
          dias_vencido: d.dias_vencido,
          ter_cell: tel
        }));
        const result = await apiPost('/whatsapp/enviar-vencimiento', {
          documentos: payload,
          rango,
          telefono: tel
        }, token);
        setResultados(prev => [...prev, { cliente: c.nombre, ...result.resultados[0] }]);
      } catch (err) {
        setResultados(prev => [...prev, { cliente: c.nombre, ok: false, error: err.message }]);
      }
      if (i < clientes.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    setEnviando(false);
    setTimeout(() => onEnviado(), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Enviar recordatorio WhatsApp</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><CloseIcon size={18} /></button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Clientes ({clientes.length}) · Documentos ({totalDocs}) · Total: S/ {fmt(totalSaldo)}</label>
        </div>

        {clientes.map((c, idx) => (
          <div key={c.ter_cote} style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--fondo)', borderRadius: 8, border: `1px solid ${resultados && resultados[idx]?.ok === false ? 'var(--rojo)' : 'var(--borde)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {resultados && resultados[idx] ? (
                  resultados[idx].ok ? <span style={{ color: '#1e8449' }}>✓ Enviado</span> : <span style={{ color: 'var(--rojo)' }}>✗ {resultados[idx].error}</span>
                ) : (
                  enviando && clienteActual === idx ? <span style={{ color: 'var(--warning)' }}>Enviando...</span> : c.nombre
                )}
              </div>
              <span className="mutado" style={{ fontSize: 12 }}>{c.documentos.length} docs</span>
            </div>
            {!resultados?.[idx]?.ok && (
              <div style={{ marginBottom: 4 }}>
                <input
                  className="input"
                  style={{ fontSize: 12, height: 30 }}
                  value={getTelefono(c)}
                  onChange={(e) => setTelefonoEditado(prev => ({ ...prev, [c.ter_cote]: e.target.value }))}
                  placeholder="Teléfono (código país + número)"
                />
              </div>
            )}
            {(!resultados || !resultados[idx]?.ok) && (
              <div style={{ background: '#fff', borderRadius: 6, padding: 8, marginTop: 4, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 120, overflow: 'auto', border: '1px solid var(--borde)' }}>
                {buildMensaje(c)}
              </div>
            )}
          </div>
        ))}

        {resultados ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CloseIcon size={16} /> Cerrar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" style={{ border: '1px solid #c0392b', color: '#c0392b', background: '#fde9ec', display: 'flex', alignItems: 'center', gap: 6 }} onClick={onClose}>
              <CloseIcon size={16} /> Cancelar
            </button>
            <button
              className="btn"
              style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={enviando || clientes.some(c => !getTelefono(c))}
              onClick={enviar}
            >
              <WhatsAppSendIcon size={16} /> {enviando ? `Enviando (${clienteActual + 1}/${clientes.length})...` : 'Enviar WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== ModalConfigVencimientos =====================
export function ModalConfigVencimientos({ rangos, editandoRango, setEditandoRango, onClose, token }) {
  const [form, setForm] = useState({ nombre: '', etiqueta: '', dias_desde: 0, dias_hasta: 0, mensaje_template: '', orden: 0 });
  const [guardando, setGuardando] = useState(false);
  const esNuevo = !!editandoRango && !editandoRango.id;

  useEffect(() => {
    if (editandoRango) {
      setForm({
        nombre: editandoRango.nombre || '',
        etiqueta: editandoRango.etiqueta || '',
        dias_desde: editandoRango.dias_desde || 0,
        dias_hasta: editandoRango.dias_hasta || 0,
        mensaje_template: editandoRango.mensaje_template || '',
        orden: editandoRango.orden || 0
      });
    }
  }, [editandoRango]);

  const guardar = async () => {
    if (esNuevo && !form.nombre.trim()) {
      alert('El nombre interno es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      if (editandoRango && editandoRango.id) {
        const { nombre, ...datos } = form;
        await apiPut(`/config/vencimientos/${editandoRango.id}`, datos, token);
      } else {
        await apiPost('/config/vencimientos', { ...form, nombre: form.nombre.trim() }, token);
      }
      setEditandoRango(null);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (rango) => {
    try {
      await apiPut(`/config/vencimientos/${rango.id}`, { activo: rango.activo ? 0 : 1 }, token);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este rango?')) return;
    try {
      await apiDelete(`/config/vencimientos/${id}`, token);
      setEditandoRango(null);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: editandoRango ? 480 : 500, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{editandoRango ? (editandoRango.id ? 'Editar Rango' : 'Nuevo Rango') : 'Configuración de Rangos'}</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><CloseIcon size={18} /></button>
        </div>

        {editandoRango ? (
          <div>
            {esNuevo && (
              <div style={{ marginBottom: 12 }}>
                <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Nombre interno (único)</label>
                <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="ej: 45_dias_vencido" />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Etiqueta</label>
              <input className="input" value={form.etiqueta} onChange={(e) => setForm({ ...form, etiqueta: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <label className="mutado" style={{ flex: 1, fontSize: 12 }}>
                Días desde
                <input className="input" type="number" style={{ width: '100%', marginTop: 4 }} value={form.dias_desde} onChange={(e) => setForm({ ...form, dias_desde: Number(e.target.value) })} />
              </label>
              <label className="mutado" style={{ flex: 1, fontSize: 12 }}>
                Días hasta
                <input className="input" type="number" style={{ width: '100%', marginTop: 4 }} value={form.dias_hasta} onChange={(e) => setForm({ ...form, dias_hasta: Number(e.target.value) })} />
              </label>
              <label className="mutado" style={{ flex: 1, fontSize: 12 }}>
                Orden
                <input className="input" type="number" style={{ width: '100%', marginTop: 4 }} value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="mutado" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Mensaje WhatsApp</label>
              <textarea
                className="input"
                rows={4}
                style={{ resize: 'vertical' }}
                value={form.mensaje_template}
                onChange={(e) => setForm({ ...form, mensaje_template: e.target.value })}
              />
              <div className="mutado" style={{ fontSize: 11, marginTop: 2 }}>Variables: {'{nombre}'} {'{doc}'} {'{fecha}'} {'{dias}'} {'{saldo}'} {'{moneda}'} {'{total}'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" style={{ border: '1px solid #c0392b', color: '#c0392b', background: '#fde9ec', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => eliminar(editandoRango.id)}>
                <CloseIcon size={14} /> Eliminar
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ border: '1px solid var(--borde)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setEditandoRango(null)}>
                  <UndoIcon size={14} /> Volver
                </button>
                <button className="btn" style={{ background: 'var(--celeste)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }} disabled={guardando} onClick={guardar}>
                  <BoldCheckIcon size={18} /> {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {rangos.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--borde)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.etiqueta}</div>
                  <div className="mutado" style={{ fontSize: 12 }}>
                    {r.dias_desde === r.dias_hasta ? `Día ${r.dias_desde}` : `${r.dias_desde} a ${r.dias_hasta} días`} · Orden: {r.orden}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={!!r.activo} onChange={() => toggleActivo(r)} />
                    {r.activo ? 'Activo' : 'Inactivo'}
                  </label>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--borde)' }} onClick={() => setEditandoRango(r)}>
                    Editar
                  </button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'var(--celeste)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setEditandoRango({ etiqueta: '', dias_desde: 0, dias_hasta: 0, mensaje_template: '', orden: rangos.length + 1 })}>
                + Nuevo rango
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
