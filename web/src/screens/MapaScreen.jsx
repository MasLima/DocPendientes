import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPut } from '../api/client';

// ============================================================
// MapaScreen — /mapas
// - Mapa de clientes con punto de referencia confirmado.
// - Mapa de "posicion de vendedores": la ultima posicion que cada
//   vendedor registro con una visita (no hay rastreo en vivo).
// Requiere permiso 'mapas.ver' (la ruta del menu ya lo filtra).
// ============================================================

const linkMaps = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

function formateaFecha(f) {
  if (!f) return '-';
  return String(f).replace('T', ' ').slice(0, 16);
}

export default function MapaScreen() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState('clientes');
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [config, setConfig] = useState([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardandoCfg, setGuardandoCfg] = useState(false);
  const [cfgMsg, setCfgMsg] = useState('');

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const capaRef = useRef(null);

  const puedeConfig = (user?.permisos || []).includes('config.ver');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [cli, vend, cfg] = await Promise.all([
        apiGet('/mapas/clientes', token),
        apiGet('/mapas/vendedores', token),
        apiGet('/mapas/config', token)
      ]);
      setClientes(Array.isArray(cli) ? cli : []);
      setVendedores(Array.isArray(vend) ? vend : []);
      setConfig(Array.isArray(cfg) ? cfg : []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  // --- Mapa Leaflet (se crea una vez) ---
  useEffect(() => {
    if (!mapRef.current && mapDivRef.current) {
      const map = L.map(mapDivRef.current, { center: [-12.05, -77.05], zoom: 5 });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      capaRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // --- Marcadores por tab/ filtrado ---
  const listaFiltrada = useMemo(() => {
    if (tab === 'clientes') return clientes;
    return vendedores;
  }, [tab, clientes, vendedores]);

  const listaBusqueda = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return listaFiltrada;
    return listaFiltrada.filter((c) =>
      String(c.ter_deno || c.cliente_nombre || c.vendedor_nombre || '').toLowerCase().includes(t) ||
      String(c.ter_cote || c.use_emno || '').toLowerCase().includes(t)
    );
  }, [listaFiltrada, q]);

  useEffect(() => {
    const capa = capaRef.current;
    const map = mapRef.current;
    if (!capa || !map) return;
    capa.clearLayers();

    if (tab === 'clientes') {
      listaBusqueda.forEach((c) => {
        const radio = c.umbral || 300;
        L.circle([Number(c.lat), Number(c.lng)], {
          radius: radio,
          color: '#85c1e9',
          weight: 1,
          fillColor: '#85c1e9',
          fillOpacity: 0.12
        }).addTo(capa);
        const m = L.circleMarker([Number(c.lat), Number(c.lng)], {
          radius: 7, color: '#1a2b4c', fillColor: '#85c1e9', fillOpacity: 1, weight: 2
        }).addTo(capa);
        m.bindPopup(`
          <strong>${c.ter_deno || c.ter_cote}</strong><br/>
          <small>${c.ter_dire || ''}</small><hr style="margin:6px 0"/>
          Vendedor: ${c.vendedor_nombre || '-'}<br/>
          Punto confirmado: ${formateaFecha(c.actualizado)}<br/>
          Visitas que lo confirmaron: ${c.visitas}<br/>
          Precisión: ±${c.gps_acc || '?'} m · umbral: ${radio} m<br/>
          <a href="${linkMaps(c.lat, c.lng)}" target="_blank" rel="noreferrer">Ver en Google Maps</a>
        `);
      });
    } else {
      listaBusqueda.forEach((v) => {
        if (v.inc_lat == null) return;
        const m = L.circleMarker([Number(v.inc_lat), Number(v.inc_lng)], {
          radius: 8, color: '#145a32', fillColor: '#27ae60', fillOpacity: 1, weight: 2
        }).addTo(capa);
        m.bindPopup(`
          <strong>${v.vendedor_nombre || v.use_emno}</strong><br/>
          Ultima visita: ${formateaFecha(v.inc_gps_fec)}<br/>
          Cliente: ${v.cliente_nombre || v.cliente_codigo || '-'}<br/>
          Precisión: ±${v.inc_gps_acc || '?'} m<br/>
          <a href="${linkMaps(v.inc_lat, v.inc_lng)}" target="_blank" rel="noreferrer">Ver en Google Maps</a>
        `);
      });
    }

    const puntos = [];
    listaBusqueda.forEach((c) => {
      const lat = tab === 'clientes' ? c.lat : c.inc_lat;
      const lng = tab === 'clientes' ? c.lng : c.inc_lng;
      if (lat != null && lng != null) puntos.push([Number(lat), Number(lng)]);
    });
    if (puntos.length > 0) {
      map.fitBounds(L.latLngBounds(puntos).pad(0.15));
    }
  }, [tab, listaBusqueda]);

  const enfocar = (c) => {
    const lat = tab === 'clientes' ? c.lat : c.inc_lat;
    const lng = tab === 'clientes' ? c.lng : c.inc_lng;
    if (lat == null || lng == null || !mapRef.current) return;
    mapRef.current.flyTo([Number(lat), Number(lng)], Math.max(mapRef.current.getZoom(), 16));
  };

  // --- Config GPS ---
  const valorCfg = (clave, def) => {
    const f = config.find((c) => c.clave === clave);
    return f ? f.valor : def;
  };
  const [cfgGlobal, setCfgGlobal] = useState('');
  const [cfgTope, setCfgTope] = useState('');

  useEffect(() => {
    setCfgGlobal(valorCfg('umbral_global', '300'));
    setCfgTope(valorCfg('umbral_tope', '2000'));
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardarConfig = async () => {
    setGuardandoCfg(true);
    setCfgMsg('');
    try {
      const r = await apiPut('/mapas/config', {
        umbral_global: Number(cfgGlobal),
        umbral_tope: Number(cfgTope)
      }, token);
      setConfig(r.config || config);
      setCfgMsg('Guardado');
    } catch (err) {
      setCfgMsg(err.message);
    } finally {
      setGuardandoCfg(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn"
            style={{ background: tab === 'clientes' ? 'var(--primario)' : 'var(--tarjeta)', color: tab === 'clientes' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
            onClick={() => setTab('clientes')}
          >
            📍 Clientes ({clientes.length})
          </button>
          <button
            className="btn"
            style={{ background: tab === 'vendedores' ? 'var(--primario)' : 'var(--tarjeta)', color: tab === 'vendedores' ? '#fff' : 'var(--texto)', border: '1px solid var(--borde)' }}
            onClick={() => setTab('vendedores')}
          >
            🛵 Vendedores ({vendedores.length})
          </button>
        </div>
        {tab === 'vendedores' && (
          <span className="mutado" style={{ fontSize: 12 }}>
            Posición de cada vendedor = su última visita registrada con GPS
          </span>
        )}
      </div>

      {puedeConfig && (
        <details className="card" style={{ marginBottom: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>⚙️ Configuración GPS</summary>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div className="mutado" style={{ fontSize: 12, marginBottom: 4 }}>Umbral global (m)</div>
              <input
                className="input"
                type="number"
                value={cfgGlobal}
                onChange={(e) => setCfgGlobal(e.target.value)}
                style={{ width: 130 }}
              />
            </div>
            <div>
              <div className="mutado" style={{ fontSize: 12, marginBottom: 4 }}>Tope de actualización (m)</div>
              <input
                className="input"
                type="number"
                value={cfgTope}
                onChange={(e) => setCfgTope(e.target.value)}
                style={{ width: 130 }}
              />
            </div>
            <button className="btn btn-accion" style={{ background: 'var(--celeste)', color: '#fff', height: 40 }} disabled={guardandoCfg} onClick={guardarConfig}>
              {guardandoCfg ? 'Guardando...' : 'Guardar'}
            </button>
            {cfgMsg && <span className="mutado" style={{ fontSize: 12 }}>{cfgMsg}</span>}
          </div>
          <div className="mutado" style={{ fontSize: 12, marginTop: 6 }}>
            Umbral: distancia máxima para considerar "en el local" (si supera, la app pregunta actualizar). Tope: distancia máxima que se acepta para MOVER el punto guardado.
          </div>
        </details>
      )}

      {cargando ? (
        <div className="vacio">Cargando mapas...</div>
      ) : error ? (
        <div className="vacio" style={{ color: 'var(--rojo)' }}>{error}</div>
      ) : listaBusqueda.length === 0 ? (
        <div className="vacio">
          {tab === 'clientes'
            ? 'Aún no hay clientes con punto confirmado (se guarda desde la app móvil al registrar la primera visita con GPS).'
            : 'Aún no hay vendedores con visitas registradas con GPS.'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <div className="card" style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: 560 }}>
            <input
              className="input"
              placeholder="Buscar por nombre o código..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ marginBottom: 8, width: '100%' }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {tab === 'clientes' ? listaBusqueda.map((c) => (
                <div
                  key={c.ter_cote}
                  onClick={() => enfocar(c)}
                  style={{ padding: '8px 6px', borderBottom: '1px solid var(--borde)', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.ter_deno || c.ter_cote}</div>
                  <div className="mutado" style={{ fontSize: 11 }}>
                    {c.vendedor_nombre || 'Sin vendedor'} · confirmado {formateaFecha(c.actualizado)} · {c.visitas} visita(s)
                  </div>
                </div>
              )) : listaBusqueda.map((v) => (
                <div
                  key={v.use_emno}
                  onClick={() => enfocar(v)}
                  style={{ padding: '8px 6px', borderBottom: '1px solid var(--borde)', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{v.vendedor_nombre || v.use_emno}</div>
                  <div className="mutado" style={{ fontSize: 11 }}>
                    Última visita: {formateaFecha(v.inc_gps_fec)} · {v.cliente_nombre || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            ref={mapDivRef}
            className="card"
            style={{ flex: 1, height: 560, padding: 0, overflow: 'hidden', minWidth: 400 }}
          />
        </div>
      )}
    </div>
  );
}
