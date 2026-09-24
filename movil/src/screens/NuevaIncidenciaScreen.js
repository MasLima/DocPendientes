import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
  KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiPost, apiGet } from '../api/client';
import API_URL from '../config';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from 'expo-speech-recognition';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  useAudioPlayer,
  useAudioPlayerStatus,
  requestRecordingPermissionsAsync,
  setAudioModeAsync
} from 'expo-audio';

// ===================== Reproductor de nota de voz =====================
function ControlesNota({ uri, onEliminar }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const { tema } = useTema();

  return (
    <View style={styles.notaControles}>
      <TouchableOpacity
        style={[styles.btnNota, { backgroundColor: tema.celeste }]}
        onPress={() => (status.playing ? player.pause() : player.play())}
      >
        <Text style={styles.btnNotaText}>{status.playing ? 'Pausar' : 'Reproducir'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnNota, styles.btnNotaEliminar]}
        onPress={onEliminar}
      >
        <Text style={[styles.btnNotaText, { color: '#c0392b' }]}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NuevaIncidenciaScreen({ route, navigation }) {
  const { token, user } = useAuth();
  const { tema } = useTema();
  const { ter_cote, ter_deno } = route.params || {};

  const [cliente, setCliente] = useState(ter_cote || '');
  const [nombreCliente, setNombreCliente] = useState(ter_deno || '');
  const [buscando, setBuscando] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [accion, setAccion] = useState('');
  const [guardando, setGuardando] = useState(false);

  // ---- Dictado voz→texto ----
  const [dictando, setDictando] = useState(null); // 'desc' | 'accion' | null
  const [previewDictado, setPreviewDictado] = useState('');
  const dictadoBaseRef = useRef('');

  // ---- Nota de voz ----
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  const [grabandoNota, setGrabandoNota] = useState(false);
  const [notaUri, setNotaUri] = useState(null);

  const buscarClientes = useCallback(async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    try {
      const data = await apiGet(`/clientes?q=${encodeURIComponent(busqueda)}`, token);
      setClientes(Array.isArray(data) ? data : data.value || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBuscando(false);
    }
  }, [busqueda, token]);

  useFocusEffect(
    useCallback(() => {
      if (!ter_cote) buscarClientes();
    }, [ter_cote, buscarClientes])
  );

  // Detener dictado al salir de la pantalla
  useEffect(() => {
    return () => {
      try { ExpoSpeechRecognitionModule.abort(); } catch (e) {}
    };
  }, []);

  // ---- Eventos de dictado ----
  useSpeechRecognitionEvent('result', (ev) => {
    const texto = ev.results?.[0]?.transcript || '';
    if (ev.isFinal) {
      const base = dictadoBaseRef.current;
      const nuevo = base ? `${base} ${texto}`.trim() : texto;
      if (dictando === 'desc') setDescripcion(nuevo);
      else if (dictando === 'accion') setAccion(nuevo);
      setPreviewDictado('');
    } else {
      setPreviewDictado(texto);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setDictando(null);
    setPreviewDictado('');
  });

  useSpeechRecognitionEvent('error', (ev) => {
    setDictando(null);
    setPreviewDictado('');
    if (ev.error && ev.error !== 'aborted' && ev.error !== 'no-speech') {
      Alert.alert('Dictado no disponible', `Error: ${ev.error}. Verifica el servicio de voz del dispositivo.`);
    }
  });

  const toggleDictado = async (campo) => {
    if (dictando) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    try {
      const disponible = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!disponible) {
        Alert.alert(
          'Dictado no disponible',
          'El reconocimiento de voz no está disponible. Instala o activa el servicio de Google (Texto por voz).'
        );
        return;
      }

      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso al micrófono para dictar.');
        return;
      }

      const textoActual = campo === 'desc' ? descripcion : accion;
      dictadoBaseRef.current = textoActual;
      setPreviewDictado('');
      setDictando(campo);

      ExpoSpeechRecognitionModule.start({
        lang: 'es-PE',
        interimResults: true
      });
    } catch (err) {
      setDictando(null);
      Alert.alert('Error', 'No se pudo iniciar el dictado.');
    }
  };

  // ---- Nota de voz: grabar / detener ----
  const iniciarNota = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso al micrófono para grabar.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setGrabandoNota(true);
      setNotaUri(null);
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  };

  const detenerNota = async () => {
    try {
      await recorder.stop();
      setGrabandoNota(false);
      setNotaUri(recorder.uri);
    } catch (err) {
      setGrabandoNota(false);
      Alert.alert('Error', 'No se pudo detener la grabación.');
    }
  };

  const eliminarNota = () => {
    setNotaUri(null);
  };

  const formatDuracion = (ms) => {
    const total = Math.floor((ms || 0) / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ---- Guardar ----
  const guardar = async () => {
    if (!cliente) {
      Alert.alert('Cliente requerido', 'Selecciona el cliente de la incidencia');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Campos requeridos', 'La descripción es obligatoria');
      return;
    }
    setGuardando(true);
    try {
      const data = await apiPost('/incidencias', {
        ter_cote: cliente,
        inc_desc: descripcion.trim(),
        inc_acci: accion.trim()
      }, token);

      // Subir nota de voz si existe (la incidencia ya está creada)
      if (notaUri) {
        try {
          const formData = new FormData();
          const extMatch = notaUri.match(/\.([a-zA-Z0-9]+)(\?|$)/);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'm4a';
          const mimeTipo = ext === 'm4a' ? 'audio/mp4' : `audio/${ext}`;
          formData.append('archivo', {
            uri: notaUri,
            name: `nota.${ext}`,
            type: mimeTipo
          });
          const res = await fetch(`${API_URL}/incidencias/${data.inc_codi}/audio`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (!res.ok) {
            Alert.alert('Incidencia guardada', 'La incidencia se guardó pero no se pudo subir la nota de voz.');
            navigation.goBack();
            return;
          }
        } catch (audioErr) {
          Alert.alert('Incidencia guardada', 'La incidencia se guardó pero no se pudo subir la nota de voz.');
          navigation.goBack();
          return;
        }
      }

      Alert.alert('Registrado', 'Incidencia guardada correctamente');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
      setGuardando(false);
    }
  };

  const micActivo = dictando !== null;
  const micRojo = '#e74c3c';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={[styles.container, { backgroundColor: tema.fondo }]} contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: tema.primario }]}>Cliente (obligatorio)</Text>
        {nombreCliente ? (
          <View style={[styles.clienteElegido, { backgroundColor: tema.gridHeader }]}>
            <Text style={[styles.clienteElegidoNombre, { color: tema.texto }]}>{nombreCliente} ({cliente})</Text>
            {!ter_cote && (
              <TouchableOpacity onPress={() => { setCliente(''); setNombreCliente(''); }}>
                <Text style={[styles.cambiar, { color: tema.azul }]}>Cambiar</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.buscarRow}>
              <TextInput
                style={styles.inputBuscar}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar cliente por nombre o código..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.btnBuscar} onPress={buscarClientes} disabled={buscando}>
                <Text style={styles.btnBuscarText}>{buscando ? '...' : 'Buscar'}</Text>
              </TouchableOpacity>
            </View>
            {clientes.length > 0 && (
              <View style={styles.lista}>
                <FlatList
                  data={clientes}
                  keyExtractor={(item) => item.ter_cote}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.itemCliente}
                      onPress={() => { setCliente(item.ter_cote); setNombreCliente(item.ter_deno); setClientes([]); }}
                    >
                      <Text style={styles.itemClienteNombre}>{item.ter_deno || 'Sin nombre'}</Text>
                      <Text style={styles.itemClienteCod}>{item.ter_cote}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </>
        )}

        {/* Descripción + micrófono */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: tema.primario, marginBottom: 0 }]}>Descripción de la visita *</Text>
          <TouchableOpacity
            style={[
              styles.btnMic,
              dictando === 'desc' && { backgroundColor: micRojo }
            ]}
            onPress={() => toggleDictado('desc')}
          >
            <Text style={styles.btnMicIcono}>{dictando === 'desc' ? '■' : '🎙'}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder={dictando === 'desc' ? 'Escuchando...' : 'Describe lo encontrado en la visita...'}
          placeholderTextColor={dictando === 'desc' ? micRojo : tema.textoSuave}
          multiline
        />
        {dictando === 'desc' && !!previewDictado && (
          <Text style={[styles.previewDictado, { color: micRojo }]}>{previewDictado}</Text>
        )}

        {/* Acción + micrófono */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: tema.primario, marginBottom: 0 }]}>Acción / gestión realizada</Text>
          <TouchableOpacity
            style={[
              styles.btnMic,
              dictando === 'accion' && { backgroundColor: micRojo }
            ]}
            onPress={() => toggleDictado('accion')}
          >
            <Text style={styles.btnMicIcono}>{dictando === 'accion' ? '■' : '🎙'}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          value={accion}
          onChangeText={setAccion}
          placeholder={dictando === 'accion' ? 'Escuchando...' : 'Compromiso, promesa de pago, observaciones...'}
          placeholderTextColor={dictando === 'accion' ? micRojo : tema.textoSuave}
          multiline
        />
        {dictando === 'accion' && !!previewDictado && (
          <Text style={[styles.previewDictado, { color: micRojo }]}>{previewDictado}</Text>
        )}

        {/* Nota de voz opcional */}
        <Text style={[styles.label, { color: tema.primario }]}>Nota de voz (opcional)</Text>
        <View style={[styles.notaBox, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          {grabandoNota ? (
            <View style={styles.notaGrabando}>
              <View style={styles.puntoRojo} />
              <Text style={[styles.notaTextoGrabando, { color: micRojo }]}>
                Grabando... {formatDuracion(recorderState.durationMillis)}
              </Text>
              <TouchableOpacity style={[styles.btnNota, { backgroundColor: micRojo }]} onPress={detenerNota}>
                <Text style={styles.btnNotaText}>Detener</Text>
              </TouchableOpacity>
            </View>
          ) : notaUri ? (
            <View>
              <Text style={[styles.notaArchivo, { color: tema.textoSuave }]}>✓ Nota de voz grabada</Text>
              <ControlesNota key={notaUri} uri={notaUri} onEliminar={eliminarNota} />
            </View>
          ) : (
            <TouchableOpacity style={[styles.btnNota, { backgroundColor: tema.celeste }]} onPress={iniciarNota}>
              <Text style={styles.btnNotaText}>⏺ Grabar nota de voz</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.hint, { color: tema.textoSuave }]}>Vendedor: {user ? user.use_logi : '-'}</Text>

        <TouchableOpacity
          style={[styles.btnGuardar, { backgroundColor: tema.celeste }, guardando && styles.btnDisabled]}
          onPress={guardar}
          disabled={guardando}
        >
          <Text style={styles.btnGuardarText}>{guardando ? 'Guardando...' : 'Guardar incidencia'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6
  },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  btnMic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  btnMicIcono: { fontSize: 18 },
  previewDictado: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 2
  },
  buscarRow: { flexDirection: 'row', gap: 8 },
  inputBuscar: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15
  },
  btnBuscar: {
    backgroundColor: '#1a2b4c', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center'
  },
  btnBuscarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  lista: {
    borderRadius: 8, borderWidth: 1,
    marginTop: 6, maxHeight: 220
  },
  itemCliente: {
    padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  itemClienteNombre: { fontSize: 14, fontWeight: '600', color: '#222' },
  itemClienteCod: { fontSize: 12, color: '#888', marginTop: 2 },
  clienteElegido: {
    borderRadius: 8, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  clienteElegidoNombre: { fontSize: 14, fontWeight: '700', flex: 1 },
  cambiar: { fontSize: 13, fontWeight: '700' },
  notaBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 4
  },
  notaGrabando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  puntoRojo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c'
  },
  notaTextoGrabando: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600'
  },
  notaArchivo: {
    fontSize: 12,
    marginBottom: 8
  },
  notaControles: {
    flexDirection: 'row',
    gap: 8
  },
  btnNota: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnNotaEliminar: {
    backgroundColor: '#fde9ec',
    borderWidth: 1,
    borderColor: '#c0392b'
  },
  btnNotaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  hint: { fontSize: 12, marginTop: 12 },
  btnGuardar: {
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 18
  },
  btnDisabled: { opacity: 0.6 },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
