import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../config';

// ============================================================
// Logica compartida de verificacion de actualizaciones.
// La usan el modal (components/Actualizador) y la pantalla
// Configuracion ("Version / Buscar actualizacion").
//
// Estados:
//   sin_verificar -> aun no se consulto
//   consultando   -> consulta en curso
//   al_dia        -> la version instalada es la ultima
//   disponible    -> hay una version nueva en el servidor
//   ignorada      -> hay version nueva pero el usuario toco "Despues" (24h)
//   error         -> no se pudo consultar (sin red, API vieja, etc.)
// ============================================================

const CLAVE_IGNORADO = 'actualizacion_ignorada';

// "Despues" oculta el aviso por 24 horas (antes era para siempre).
export const IGNORAR_MS = 24 * 60 * 60 * 1000;

let ultimo = {
  fecha: null,
  estado: 'sin_verificar',
  versionActual: versionInstalada(),
  versionServidor: null,
  nombreServidor: null,
  ignoradaHasta: null,
  error: null
};

const oyentes = new Set();

export function versionInstalada() {
  try {
    return Constants.expoConfig?.version || null;
  } catch (e) {
    return null;
  }
}

export function getEstadoActualizacion() {
  return { ...ultimo };
}

export function suscribirActualizacion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function publicar(cambios) {
  ultimo = { ...ultimo, ...cambios };
  for (const fn of oyentes) {
    try { fn({ ...ultimo }); } catch (e) {}
  }
}

function parseVersion(v) {
  return String(v || '0').split('.').map((n) => parseInt(n, 10) || 0);
}

export function esVersionMayor(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

// Lee la marca de "Despues". Devuelve { ignorada, hasta }.
// El formato antiguo (string con la version) se descarta para que
// quienes ya habian tocado "Despues" vuelvan a recibir el aviso.
async function leerIgnorada(version) {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_IGNORADO);
    if (!raw) return { ignorada: false, hasta: null };

    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }

    if (!data || typeof data !== 'object' || !data.v) {
      await AsyncStorage.removeItem(CLAVE_IGNORADO);
      return { ignorada: false, hasta: null };
    }
    if (data.v !== version) return { ignorada: false, hasta: null };

    const hasta = Number(data.ts) + IGNORAR_MS;
    if (!Number.isFinite(hasta) || Date.now() >= hasta) {
      await AsyncStorage.removeItem(CLAVE_IGNORADO);
      return { ignorada: false, hasta: null };
    }
    return { ignorada: true, hasta };
  } catch (e) {
    return { ignorada: false, hasta: null };
  }
}

// "Despues": oculta esta version durante 24h.
export async function ignorarActualizacion(version) {
  const hasta = Date.now() + IGNORAR_MS;
  try {
    await AsyncStorage.setItem(CLAVE_IGNORADO, JSON.stringify({ v: version, ts: Date.now() }));
  } catch (e) {}
  publicar({ estado: 'ignorada', ignoradaHasta: hasta });
  return hasta;
}

// Consulta GET /api/version.
// forzar=true ignora la marca de "Despues" (boton "Buscar actualizacion").
export async function verificarActualizacion({ forzar = false, timeoutMs = 8000 } = {}) {
  publicar({ estado: 'consultando', error: null });

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // cache-buster: evita que el telefono/proxy devuelva la respuesta anterior.
    const res = await fetch(`${API_URL}/version?t=${Date.now()}`, {
      signal: ctrl.signal,
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`El servidor respondio ${res.status}`);

    // Un app.js desactualizado responde con el HTML de la web (fallback SPA).
    if (!(res.headers.get('content-type') || '').includes('json')) {
      throw new Error('El servidor no informa version (API desactualizada)');
    }

    const data = await res.json();
    const actual = versionInstalada();
    const servidor = data.version || null;
    if (!servidor) throw new Error('Respuesta sin version');

    if (!esVersionMayor(servidor, actual)) {
      publicar({
        fecha: Date.now(), estado: 'al_dia',
        versionServidor: servidor, nombreServidor: data.nombre || null,
        ignoradaHasta: null, error: null
      });
      return getEstadoActualizacion();
    }

    const ign = await leerIgnorada(servidor);
    if (!forzar && ign.ignorada) {
      publicar({
        fecha: Date.now(), estado: 'ignorada',
        versionServidor: servidor, nombreServidor: data.nombre || null,
        ignoradaHasta: ign.hasta, error: null
      });
      return getEstadoActualizacion();
    }

    publicar({
      fecha: Date.now(), estado: 'disponible',
      versionServidor: servidor, nombreServidor: data.nombre || null,
      ignoradaHasta: null, error: null
    });
    return getEstadoActualizacion();
  } catch (e) {
    clearTimeout(timeout);
    const msg = e.name === 'AbortError'
      ? 'Tiempo de espera agotado'
      : (e.message || 'Sin conexion');
    publicar({ fecha: Date.now(), estado: 'error', error: msg });
    return getEstadoActualizacion();
  }
}
