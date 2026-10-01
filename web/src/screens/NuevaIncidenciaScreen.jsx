import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet, apiPut } from '../api/client';
import CampoBusqueda from '../components/CampoBusqueda';
import SelectorEmoji from '../components/SelectorEmoji';
import { CheckIcon, CloseIcon } from '../components/Iconos';

const ESTADOS = [
  { valor: 1, texto: 'Registrada' },
  { valor: 2, texto: 'En proceso' },
  { valor: 3, texto: 'Resuelta' }
];

export default function NuevaIncidenciaScreen() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const clienteInicial = searchParams.get('cliente') || '';
  const nombreInicial = searchParams.get('nombre') || '';
  // Modo "otros clientes": la busqueda ignora la cartera del vendedor (?todos=1).
  const otrosClientes = searchParams.get('otros') === '1';
  // Modo edicion: ?editar=ID
  const editarId = searchParams.get('editar');

  const [cliente, setCliente] = useState(clienteInicial);
  const [nombreCliente, setNombreCliente] = useState(nombreInicial);
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [accion, setAccion] = useState('');
  const [estado, setEstado] = useState(1);
  const [origenErp, setOrigenErp] = useState(false);
  const [cargandoEdicion, setCargandoEdicion] = useState(!!editarId);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const refDesc = useRef(null);
  const refAccion = useRef(null);

  // Carga de la incidencia a editar
  useEffect(() => {
    if (!editarId) return;
    let activo = true;
    (async () => {
      try {
        const inc = await apiGet(`/incidencias/${editarId}`, token);
        if (!activo) return;
        setCliente(inc.ter_cote || '');
        setNombreCliente(inc.cliente_nombre || inc.ter_cote || '');
        setDescripcion(inc.inc_desc || '');
        setAccion(inc.inc_acci || '');
        setEstado(Number(inc.inc_estc) || 1);
        setOrigenErp(!!inc.inc_codi_erp);
        if (inc.inc_codi_erp) setError('Incidencia proveniente del ERP: no es editable.');
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargandoEdicion(false);
      }
    })();
    return () => { activo = false; };
  }, [editarId, token]);

  useEffect(() => {
    if (!busqueda.trim() || nombreCliente) return;
    let activo = true;
    const delay = setTimeout(async () => {
      try {
        const data = await apiGet(`/clientes?q=${encodeURIComponent(busqueda)}${otrosClientes ? '&todos=1' : ''}`, token);
        if (activo) setClientes(Array.isArray(data) ? data : data.value || []);
      } catch { /* noop */ }
    }, 350);
    return () => { activo = false; clearTimeout(delay); };
  }, [busqueda, nombreCliente, otrosClientes, token]);

  // Inserta un emoji en el cursor del textarea correspondiente.
  const insertarEmoji = (campo, emoji) => {
    const ref = campo === 'desc' ? refDesc : refAccion;
    const setter = campo === 'desc' ? setDescripcion : setAccion;
    const el = ref.current;
    if (!el) {
      setter(prev => prev + emoji);
      return;
    }
    const ini = el.selectionStart ?? el.value.length;
    const fin = el.selectionEnd ?? el.value.length;
    const nuevo = el.value.slice(0, ini) + emoji + el.value.slice(fin);
    setter(nuevo);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = ini + emoji.length;
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!cliente) {
      setError('Selecciona el cliente de la incidencia');
      return;
    }
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }
    if (origenErp) {
      setError('Incidencia proveniente del ERP: no es editable.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      if (editarId) {
        await apiPut(`/incidencias/${editarId}`, {
          inc_desc: descripcion.trim(),
          inc_acci: accion.trim(),
          inc_estc: Number(estado)
        }, token);
      } else {
        await apiPost('/incidencias', {
          ter_cote: cliente,
          inc_desc: descripcion.trim(),
          inc_acci: accion.trim()
        }, token);
      }
      navigate(-1);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  if (cargandoEdicion) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>← Volver</button>
        <div className="vacio">Cargando incidencia...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>← Volver</button>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>{editarId ? 'Editar incidencia' : 'Nueva incidencia'}</h2>

      {!editarId && otrosClientes && (
        <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(133,193,233,0.15)', border: '1px solid var(--celeste)', borderRadius: 6, fontSize: 13 }}>
          Incidencia para <strong>otros clientes</strong> — la búsqueda incluye clientes que no tienes asignados.
        </div>
      )}

      <form onSubmit={guardar}>
        <div style={{ marginBottom: 14 }}>
          <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Cliente (obligatorio)</label>
          {nombreCliente ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(26,43,76,0.06)' }}>
              <strong>{nombreCliente} ({cliente})</strong>
              {!clienteInicial && !editarId && (
                <button type="button" className="btn btn-ghost" onClick={() => { setCliente(''); setNombreCliente(''); }}>Cambiar</button>
              )}
            </div>
          ) : (
            <>
              <CampoBusqueda
                width="100%"
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar cliente por nombre o código..."
              />
              {clientes.length > 0 && (
                <div className="card" style={{ marginTop: 6, maxHeight: 220, overflowY: 'auto', padding: 6 }}>
                  {clientes.map((c) => (
                    <button
                      key={c.ter_cote}
                      type="button"
                      className="btn btn-ghost"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--borde)' }}
                      onMouseDown={() => { setCliente(c.ter_cote); setNombreCliente(c.ter_deno); setClientes([]); }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.ter_deno || 'Sin nombre'}</div>
                      <div className="mutado">{c.ter_cote}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="mutado" style={{ marginBottom: 0 }}>Descripción de la visita *</label>
            <SelectorEmoji onInsert={(e) => insertarEmoji('desc', e)} />
          </div>
          <textarea
            className="input"
            rows={4}
            ref={refDesc}
            placeholder="Describe lo encontrado en la visita..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ minHeight: 90 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="mutado" style={{ marginBottom: 0 }}>Acción / gestión realizada</label>
            <SelectorEmoji onInsert={(e) => insertarEmoji('accion', e)} />
          </div>
          <textarea
            className="input"
            rows={3}
            ref={refAccion}
            placeholder="Compromiso, promesa de pago, observaciones..."
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>

        {editarId && (
          <div style={{ marginBottom: 14 }}>
            <label className="mutado" style={{ display: 'block', marginBottom: 4 }}>Estado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ESTADOS.map((s) => (
                <button
                  key={s.valor}
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    height: 36,
                    border: '1px solid var(--borde)',
                    background: Number(estado) === s.valor ? 'var(--active)' : 'var(--tarjeta)',
                    fontWeight: Number(estado) === s.valor ? 700 : 400
                  }}
                  onClick={() => setEstado(s.valor)}
                >
                  {s.texto}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mutado" style={{ marginBottom: 14 }}>Vendedor: {user ? user.use_logi : '-'}</div>

        {error && (
          <div style={{ color: 'var(--rojo)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button className="btn btn-accion" style={{ background: 'var(--celeste)', color: '#fff', height: 40 }} type="submit" disabled={guardando || origenErp}>
          <CheckIcon size={20} /> {guardando ? 'Guardando...' : editarId ? 'Guardar cambios' : 'Guardar incidencia'}
        </button>
      </form>
    </div>
  );
}
