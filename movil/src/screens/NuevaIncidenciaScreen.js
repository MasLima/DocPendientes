import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

export default function NuevaIncidenciaScreen({ route, navigation }) {
  const { token, user } = useAuth();
  const { ter_cote, ter_deno } = route.params || {};

  const [cliente, setCliente] = useState(ter_cote || '');
  const [nombreCliente, setNombreCliente] = useState(ter_deno || '');
  const [descripcion, setDescripcion] = useState('');
  const [accion, setAccion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!cliente || !descripcion.trim()) {
      Alert.alert('Campos requeridos', 'Cliente y descripción son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      await apiPost('/incidencias', {
        ter_cote: cliente,
        inc_desc: descripcion.trim(),
        inc_acci: accion.trim()
      }, token);
      Alert.alert('Registrado', 'Incidencia guardada correctamente');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Cliente (código)</Text>
        <TextInput
          style={styles.input}
          value={cliente}
          onChangeText={(t) => { setCliente(t); setNombreCliente(''); }}
          placeholder="Código del cliente"
        />
        {nombreCliente ? <Text style={styles.nombre}>{nombreCliente}</Text> : null}

        <Text style={styles.label}>Descripción de la visita *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe lo encontrado en la visita..."
          multiline
        />

        <Text style={styles.label}>Acción / gestión realizada</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={accion}
          onChangeText={setAccion}
          placeholder="Compromiso, promesa de pago, observaciones..."
          multiline
        />

        <Text style={styles.hint}>Vendedor: {user ? user.use_logi : '-'}</Text>

        <TouchableOpacity
          style={[styles.btnGuardar, guardando && styles.btnDisabled]}
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
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a2b4c', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  nombre: { fontSize: 13, color: '#27ae60', marginTop: 4, fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', marginTop: 12 },
  btnGuardar: {
    backgroundColor: '#27ae60', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 18
  },
  btnDisabled: { opacity: 0.6 },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
