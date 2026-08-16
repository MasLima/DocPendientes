import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

export default function ClientesScreen({ navigation }) {
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet('/clientes', token);
      setClientes(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const filtrados = clientes.filter((c) =>
    (c.ter_deno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.ter_rucn || '').includes(busqueda)
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.buscador}
        placeholder="Buscar cliente (nombre o RUC)..."
        value={busqueda}
        onChangeText={setBusqueda}
      />
      {cargando ? (
        <Text style={styles.vacio}>Cargando clientes...</Text>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.ter_cote}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ClienteDetalle', { ter_cote: item.ter_cote, ter_deno: item.ter_deno })}
            >
              <Text style={styles.nombre}>{item.ter_deno || 'Sin nombre'}</Text>
              <Text style={styles.detalle}>{item.ter_rucn || '-'}  |  {item.ter_fono || 'sin teléfono'}</Text>
              <Text style={styles.condicion}>
                {item.ter_cocp ? `Cond. pago: ${item.ter_cocp}` : ''}
                {item.ter_licr ? `   Límite: ${item.ter_licr}` : ''}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.vacio}>No hay clientes asignados</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 12 },
  buscador: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, fontSize: 15
  },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee'
  },
  nombre: { fontSize: 16, fontWeight: '700', color: '#1a2b4c' },
  detalle: { fontSize: 13, color: '#555', marginTop: 4 },
  condicion: { fontSize: 12, color: '#888', marginTop: 4 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 15 }
});
