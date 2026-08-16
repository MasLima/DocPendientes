import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

export default function ElegirClienteScreen({ navigation }) {
  const { token } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const buscar = useCallback(async () => {
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

  return (
    <View style={styles.container}>
      <View style={styles.buscarRow}>
        <TextInput
          style={styles.input}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar cliente por nombre o código..."
          placeholderTextColor="#999"
          autoFocus
        />
        <TouchableOpacity style={styles.btnBuscar} onPress={buscar} disabled={buscando}>
          <Text style={styles.btnBuscarText}>{buscando ? '...' : 'Buscar'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clientes}
        keyExtractor={(item) => item.ter_cote}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('IncidenciasLista', {
              filtroCliente: { ter_cote: item.ter_cote, ter_deno: item.ter_deno }
            })}
          >
            <Text style={styles.nombre}>{item.ter_deno || 'Sin nombre'}</Text>
            <Text style={styles.cod}>{item.ter_cote}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {busqueda ? 'Busca para ver clientes' : 'Escribe un nombre o código y pulsa Buscar'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 12 },
  buscarRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15
  },
  btnBuscar: {
    backgroundColor: '#1a2b4c', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center'
  },
  btnBuscarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  item: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee'
  },
  nombre: { fontSize: 15, fontWeight: '700', color: '#1a2b4c' },
  cod: { fontSize: 12, color: '#888', marginTop: 3 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 14 }
});