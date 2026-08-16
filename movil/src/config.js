import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================
// URL del API backend.
//
// La IP se detecta AUTOMATICAMENTE desde el host de Metro
// (Constants.expoConfig.hostUri), que es la misma IP LAN del PC
// que el celular usa para cargar la app. Asi no hay que editar
// nada cuando cambia el Wi-Fi.
//
// Manual (caso de excepcion): si la deteccion falla, editar IP_LAN.
// ============================================================
const PORT_API = 3000;

// Si la deteccion automatica falla, usar esta IP manual:
const IP_LAN_MANUAL = '192.168.101.5';

function obtenerHostApi() {
  // En web el navegador corre en el mismo PC que la API.
  if (Platform.OS === 'web') return 'localhost';

  try {
    // hostUri: "192.168.101.5:8081" (host de Metro en Expo Go / dev build)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      // Quitar el puerto ":8081" y quedarnos con la IP.
      const host = hostUri.replace(/:\d+$/, '');
      if (host) return host;
    }
  } catch (e) {
    // seguir con el manual
  }

  return IP_LAN_MANUAL;
}

export default `http://${obtenerHostApi()}:${PORT_API}/api`;