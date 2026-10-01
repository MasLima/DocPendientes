import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
  KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiPost, apiGet, apiPut } from '../api/client';
import API_URL from '../config';
import SelectorEmoji from '../components/SelectorEmoji';
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

const ESTADOS = [
  { valor: 1, texto: 'Registrada' },
  { valor: 2, texto: 'En proceso' },
  { valor: 3, texto: 'Resuelta' }
];

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
  const { ter_cote, ter_deno, otros, editar } = route.params || {};
  // Modo "otros clientes": la busqueda ignora la cartera del vendedor (?todos=1).
  const otrosClientes = !!otros;
  // Modo edicion
  const editarId = editar ? String(editar) : '';

  const [cliente, setCliente] = useState(ter_cote || '');
  const [nombreCliente, setNombreCliente] = useState(ter_deno || '');
  const [buscando, setBuscando] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [accion, setAccion] = useState('');
  const [estado, setEstado] = useState(1);
  const [origenErp, setOrigenErp] = useState(false);
  const [cargandoEdicion, setCargandoEdicion] = useState(!!editar);
  const [guardando, setGuardando] = useState(false);

  // Cursor de los textos (para insertar emoji en la posicion correcta)
  const selDescRef = useRef({ start: 0, end: 0 });
  const selAccionRef = useRef({ start: 0, end: 0 });
  const [selDescPost, setSelDescPost] = useState(null);
  const [selAccionPost, setSelAccionPost] = useState(null);

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
      const data = await apiGet(`/clientes?q=${encodeURIComponent(busqueda)}${otrosClientes ? '&todos=1' : ''}`, token);
      setClientes(Array.isArray(data) ? data : data.value || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBuscando(false);
    }
  }, [busqueda, otrosClientes, token]);

  useFocusEffect(
    useCallback(() => {
      if (!ter_cote) buscarClientes();
    }, [ter_cote, buscarClientes])
  );

  // Titulo segun modo
  useEffect(() => {
    navigation.setOptions({ title: editarId ? 'Editar Incidencia' : 'Nueva Incidencia' });
  }, [editarId, navigation]);

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
        if (inc.inc_codi_erp) {
          Alert.alert('No editable', 'Incidencia proveniente del ERP: no es editable.');
        }
      } catch (err) {
        if (activo) Alert.alert('Error', err.message);
      } finally {
        if (activo) setCargandoEdicion(false);
      }
    })();
    return () => { activo = false; };
  }, [editarId, token]);

  // Inserta un emoji en el cursor del texto correspondiente.
  const insertarEmoji = (campo, emoji) => {
    const esDesc = campo === 'desc';
    const valor = esDesc ? descripcion : accion;
    const setter = esDesc ? setDescripcion : setAccion;
    const ref = esDesc ? selDescRef : selAccionRef;
    const setPost = esDesc ? setSelDescPost : setSelAccionPost;
    const { start, end } = ref.current;
    const ini = Math.min(start, valor.length);
    const fin = Math.min(end, valor.length);
    const nuevo = valor.slice(0, ini) + emoji + valor.slice(fin);
    setter(nuevo);
    setPost({ start: ini + emoji.length, end: ini + emoji.length });
  };

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
    if (origenErp) {
      Alert.alert('No editable', 'Incidencia proveniente del ERP: no es editable.');
      return;
    }
    setGuardando(true);
    try {
      let codiAudio = null;
      if (editarId) {
        await apiPut(`/incidencias/${editarId}`, {
          inc_desc: descripcion.trim(),
          inc_acci: accion.trim(),
          inc_estc: Number(estado)
        }, token);
        codiAudio = editarId;
      } else {
        const data = await apiPost('/incidencias', {
          ter_cote: cliente,
          inc_desc: descripcion.trim(),
          inc_acci: accion.trim()
        }, token);
        codiAudio = data.inc_codi;
      }

      // Subir nota de voz si existe (la incidencia ya está creada/editada)
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
          const res = await fetch(`${API_URL}/incidencias/${codiAudio}/audio`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (!res.ok) {
            Alert.alert(editarId ? 'Actualizada' : 'Guardada', 'La incidencia se guardó pero no se pudo subir la nota de voz.');
            navigation.goBack();
            return;
          }
        } catch (audioErr) {
          Alert.alert(editarId ? 'Actualizada' : 'Guardada', 'La incidencia se guardó pero no se pudo subir la nota de voz.');
          navigation.goBack();
          return;
        }
      }

      Alert.alert(editarId ? 'Actualizada' : 'Registrado', editarId ? 'Incidencia actualizada correctamente' : 'Incidencia guardada correctamente');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
      setGuardando(false);
    }
  };

  const micActivo = dictando !== null;
  const micRojo = '#e74c3c';

  if (cargandoEdicion) {
    return (
      <View style={[styles.flex, { backgroundColor: tema.fondo, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: tema.textoSuave, fontSize: 14 }}>Cargando incidencia...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={[styles.container, { backgroundColor: tema.fondo }]} contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: tema.primario }]}>Cliente (obligatorio)</Text>
        {otrosClientes && (
          <Text style={[styles.avisoOtros, { backgroundColor: `${tema.celeste}22`, color: tema.primario }]}>
            Buscando en todos los clientes (incluye no asignados)
          </Text>
        )}
        {nombreCliente ? (
          <View style={[styles.clienteElegido, { backgroundColor: tema.gridHeader }]}>
            <Text style={[styles.clienteElegidoNombre, { color: tema.texto }]}>{nombreCliente} ({cliente})</Text>
            {!ter_cote && !editarId && (
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

        {/* Descripción + micrófono + emojis */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: tema.primario, marginBottom: 0 }]}>Descripción de la visita *</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SelectorEmoji color={tema.celeste} onInsert={(e) => insertarEmoji('desc', e)} />
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
        </View>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          value={descripcion}
          onChangeText={setDescripcion}
          selection={selDescPost || undefined}
          onSelectionChange={(e) => {
            selDescRef.current = e.nativeEvent.selection;
            if (selDescPost) setSelDescPost(null);
          }}
          placeholder={dictando === 'desc' ? 'Escuchando...' : 'Describe lo encontrado en la visita...'}
          placeholderTextColor={dictando === 'desc' ? micRojo : tema.textoSuave}
          multiline
        />
        {dictando === 'desc' && !!previewDictado && (
          <Text style={[styles.previewDictado, { color: micRojo }]}>{previewDictado}</Text>
        )}

        {/* Acción + micrófono + emojis */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: tema.primario, marginBottom: 0 }]}>Acción / gestión realizada</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SelectorEmoji color={tema.celeste} onInsert={(e) => insertarEmoji('accion', e)} />
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
        </View>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          value={accion}
          onChangeText={setAccion}
          selection={selAccionPost || undefined}
          onSelectionChange={(e) => {
            selAccionRef.current = e.nativeEvent.selection;
            if (selAccionPost) setSelAccionPost(null);
          }}
          placeholder={dictando === 'accion' ? 'Escuchando...' : 'Compromiso, promesa de pago, observaciones...'}
          placeholderTextColor={dictando === 'accion' ? micRojo : tema.textoSuave}
          multiline
        />
        {dictando === 'accion' && !!previewDictado && (
          <Text style={[styles.previewDictado, { color: micRojo }]}>{previewDictado}</Text>
        )}

        {/* Estado (solo modo edición) */}
        {editarId && (
          <View>
            <Text style={[styles.label, { color: tema.primario }]}>Estado</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ESTADOS.map((s) => (
                <TouchableOpacity
                  key={s.valor}
                  style={[
                    styles.chipEstado,
                    {
                      borderColor: Number(estado) === s.valor ? tema.celeste : tema.borde,
                      backgroundColor: Number(estado) === s.valor ? `${tema.celeste}33` : tema.tarjeta
                    }
                  ]}
                  onPress={() => setEstado(s.valor)}
                >
                  <Text style={{ fontSize: 13, fontWeight: Number(estado) === s.valor ? '700' : '400', color: tema.texto }}>
                    {s.texto}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
          style={[styles.btnGuardar, { backgroundColor: tema.celeste }, (guardando || origenErp) && styles.btnDisabled]}
          onPress={guardar}
          disabled={guardando || origenErp}
        >
          <Text style={styles.btnGuardarText}>
            {guardando ? 'Guardando...' : editarId ? 'Guardar cambios' : 'Guardar incidencia'}
          </Text>
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
  avisoOtros: { fontSize: 12, fontWeight: '600', padding: 6, borderRadius: 6, textAlign: 'center', marginBottom: 6 },
  chipEstado: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
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
