import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================
// URL del API backend.
// Produccion: http://190.12.91.41:3000/api
// Desarrollo local: localhost
// ============================================================
const PORT_API = 3000;

const IP_SERVIDOR = '190.12.91.41';

function obtenerHostApi() {
  if (Platform.OS === 'web') return 'localhost';

  try {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.replace(/:\d+$/, '');
      if (host) return host;
    }
  } catch (e) {}

  return IP_SERVIDOR;
}

export default `http://${obtenerHostApi()}:${PORT_API}/api`;