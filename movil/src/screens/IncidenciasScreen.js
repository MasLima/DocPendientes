import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

export default function IncidenciasScreen({ navigation }) {
  const { token } = useAuth();
  const [incidencias, setIncidencias] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet('/incidencias', token);
      setIncidencias(data);
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

  const estadoColor = (inc_estc) => {
    if (inc_estc === 1) return '#e67e22';
    if (inc_estc === 2) return '#2980b9';
    if (inc_estc === 3) return '#27ae60';
    return '#7f8c8d';
  };

  const estadoTexto = (inc_estc) => {
    if (inc_estc === 1) return 'Registrada';
    if (inc_estc === 2) return 'En proceso';
    if (inc_estc === 3) return 'Resuelta';
    return 'Desconocido';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.btnNueva}
        onPress={() => navigation.navigate('NuevaIncidencia', {})}
      >
        <Text style={styles.btnNuevaText}>+ Nueva incidencia</Text>
      </TouchableOpacity>

      {cargando ? (
        <Text style={styles.vacio}>Cargando...</Text>
      ) : (
        <FlatList
          data={incidencias}
          keyExtractor={(item) => String(item.inc_codi)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.nro}>#{item.inc_codi}</Text>
                <Text style={[styles.estado, { backgroundColor: estadoColor(item.inc_estc) }]}>
                  {estadoTexto(item.inc_estc)}
                </Text>
              </View>
              <Text style={styles.cliente}>{item.ter_deno || 'Sin cliente'}</Text>
              <Text style={styles.desc} numberOfLines={2}>{item.inc_desc}</Text>
              <Text style={styles.fecha}>{item.fe_regi}</Text>
              {item.sincronizada === 0 && (
                <Text style={styles.sinSync}>Pendiente de sincronizar</Text>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.vacio}>No hay incidencias registradas</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 12 },
  btnNueva: {
    backgroundColor: '#1a2b4c', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginBottom: 10
  },
  btnNuevaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#eee'
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nro: { fontSize: 14, fontWeight: '700', color: '#1a2b4c' },
  estado: { color: '#fff', fontSize: 11, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  cliente: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  desc: { fontSize: 13, color: '#555', marginTop: 4 },
  fecha: { fontSize: 12, color: '#999', marginTop: 4 },
  sinSync: { fontSize: 11, color: '#e67e22', fontWeight: '700', marginTop: 4 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 15 }
});
