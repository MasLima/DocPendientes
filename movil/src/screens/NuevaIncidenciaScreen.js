import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
  KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiPost, apiGet } from '../api/client';

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

        <Text style={[styles.label, { color: tema.primario }]}>Descripción de la visita *</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe lo encontrado en la visita..."
          placeholderTextColor={tema.textoSuave}
          multiline
        />

        <Text style={[styles.label, { color: tema.primario }]}>Acción / gestión realizada</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          value={accion}
          onChangeText={setAccion}
          placeholder="Compromiso, promesa de pago, observaciones..."
          placeholderTextColor={tema.textoSuave}
          multiline
        />

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
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
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
  hint: { fontSize: 12, marginTop: 12 },
  btnGuardar: {
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 18
  },
  btnDisabled: { opacity: 0.6 },
  btnGuardarText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});