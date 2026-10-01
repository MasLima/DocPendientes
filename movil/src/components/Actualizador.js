import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import API_URL from '../config';
import { useTema } from '../context/ThemeContext';

const CLAVE_IGNORADO = 'actualizacion_ignorada';
const PAQUETE = 'com.docpendientes.cobranza';

function parseVersion(v) {
  return String(v || '0').split('.').map((n) => parseInt(n, 10) || 0);
}

function esVersionMayor(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

// ============================================================
// Actualizador automatico de la APK.
// Consulta GET /api/version y, si hay una version mas reciente
// que la instalada, ofrece descargarla e instalarla desde la
// propia app (Android). "Despues" oculta el aviso para esa
// version; cuando salga una mas nueva volvera a preguntar.
// ============================================================
export default function Actualizador() {
  const { tema } = useTema();
  const [actualizacion, setActualizacion] = useState(null); // { version, nombre }
  const [descargando, setDescargando] = useState(false);
  const [progreso, setProgreso] = useState(0);

  const verificar = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${API_URL}/version`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) return;
      const data = await res.json();
      const actual = Constants.expoConfig?.version;
      if (!data.version || !esVersionMayor(data.version, actual)) return;
      const ignorado = await AsyncStorage.getItem(CLAVE_IGNORADO);
      if (ignorado === data.version) return;
      setActualizacion({ version: data.version, nombre: data.nombre });
    } catch (e) {
      // Sin internet o API caida: se ignora silenciosamente
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    // Pequena espera para no competir con la carga inicial de la app
    const t = setTimeout(verificar, 4000);
    return () => clearTimeout(t);
  }, [verificar]);

  const despues = useCallback(async () => {
    if (actualizacion) {
      try { await AsyncStorage.setItem(CLAVE_IGNORADO, actualizacion.version); } catch (e) {}
    }
    setActualizacion(null);
  }, [actualizacion]);

  const actualizar = useCallback(async () => {
    if (!actualizacion || descargando) return;
    let uriDescargado = null;
    try {
      setDescargando(true);
      setProgreso(0);
      const destino = `${FileSystem.cacheDirectory}actualizacion.apk`;
      const tarea = FileSystem.createDownloadResumable(
        `${API_URL}/download/apk`,
        destino,
        {},
        (p) => {
          if (p.totalBytesExpectedToWrite > 0) {
            setProgreso(p.totalBytesWritten / p.totalBytesExpectedToWrite);
          }
        }
      );
      const res = await tarea.downloadAsync();
      if (!res || res.status !== 200 || !res.uri) throw new Error('descarga fallida');
      uriDescargado = res.uri;
      setProgreso(1);
      setDescargando(false);

      const contentUri = await FileSystem.getContentUriAsync(uriDescargado);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1
      });
      // Al instalar, Android reemplaza la app y este proceso termina solo.
      setActualizacion(null);
    } catch (e) {
      setDescargando(false);
      if (uriDescargado) {
        // La descarga salio bien: fallo el instalador (origen desconocido)
        Alert.alert(
          'Instalacion bloqueada',
          'Permite "Instalar apps desconocidas" para Cobranza en los ajustes y vuelve a tocar Actualizar.'
        );
        try {
          await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
            data: `package:${PAQUETE}`
          });
        } catch (e2) {
          // Algunos dispositivos no abren ese ajuste directamente
        }
      } else {
        Alert.alert('No se pudo descargar', 'Verifica tu conexion e intenta de nuevo.');
      }
    }
  }, [actualizacion, descargando]);

  if (!actualizacion) return null;

  const porcentaje = Math.round(progreso * 100);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={descargando ? undefined : despues}>
      <View style={estilos.overlay}>
        <View style={[estilos.caja, { backgroundColor: tema.tarjeta }]}>
          <Text style={[estilos.titulo, { color: tema.primario }]}>Nueva versión disponible</Text>
          <Text style={[estilos.texto, { color: tema.textoSuave }]}>
            Versión {actualizacion.version} de Cobranza
            {'\n'}Se descargará e instalará automáticamente.
          </Text>

          {descargando ? (
            <View style={estilos.bloqueProgreso}>
              <View style={[estilos.progresoFondo, { backgroundColor: tema.fondo }]}>
                <View style={[estilos.progresoBarra, { width: `${porcentaje}%` }]} />
              </View>
              <Text style={[estilos.porcentaje, { color: tema.textoSuave }]}>
                Descargando... {porcentaje}%
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={[estilos.btnPrincipal, { backgroundColor: tema.celeste }]} onPress={actualizar}>
                <Text style={estilos.btnPrincipalTexto}>Actualizar ahora</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.btnSecundario} onPress={despues}>
                <Text style={estilos.btnSecundarioTexto}>Después</Text>
              </TouchableOpacity>
            </>
          )}

          {descargando && <ActivityIndicator style={{ marginTop: 10 }} color={tema.celeste} />}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  caja: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center'
  },
  titulo: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  texto: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  bloqueProgreso: { width: '100%', alignItems: 'center' },
  progresoFondo: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8
  },
  progresoBarra: {
    height: '100%',
    backgroundColor: '#25D366',
    borderRadius: 5
  },
  porcentaje: { fontSize: 13, fontWeight: '600' },
  btnPrincipal: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  btnPrincipalTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecundario: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fde9ec'
  },
  btnSecundarioTexto: { color: '#c0392b', fontSize: 15, fontWeight: '700' }
});
