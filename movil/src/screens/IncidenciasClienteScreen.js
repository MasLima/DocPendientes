import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

export default function IncidenciasClienteScreen({ route, navigation }) {
  const { ter_cote, ter_deno } = route.params || {};
  const { token } = useAuth();
  const [incidencias, setIncidencias] = useState([]);
  const [frecuencia, setFrecuencia] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [data, freq] = await Promise.all([
        apiGet(`/incidencias/cliente/${ter_cote}`, token),
        apiGet('/incidencias/frecuencia', token)
      ]);
      setIncidencias(Array.isArray(data) ? data : data.value || []);
      setFrecuencia(Array.isArray(freq) ? freq : freq.value || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [token, ter_cote]);

  useFocusEffect(
    useCallback(() => { cargar(); }, [cargar])
  );

  const resumen = frecuencia.find((f) => String(f.ter_cote) === String(ter_cote)) || {};
  const ultima = incidencias[0];

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
      <View style={styles.headerCard}>
        <Text style={styles.cliente}>{ter_deno || ter_cote}</Text>

        <View style={styles.metricas}>
          <View style={styles.metrica}>
            <Text style={styles.metricaNum}>{resumen.total_visitas || incidencias.length || 0}</Text>
            <Text style={styles.metricaLbl}>Visitas</Text>
          </View>
          <View style={styles.metrica}>
            <Text style={styles.metricaNum}>{resumen.ultima_visita || ultima?.fe_regi || '-'}</Text>
            <Text style={styles.metricaLbl}>Última visita</Text>
          </View>
          <View style={styles.metrica}>
            <Text style={styles.metricaNum}>
              {resumen.promedio_dias_entre_visitas ? `~${resumen.promedio_dias_entre_visitas}d` : '-'}
            </Text>
            <Text style={styles.metricaLbl}>Frecuencia</Text>
          </View>
        </View>

        {ultima ? (
          <View style={styles.ultima}>
            <Text style={styles.ultimaTitulo}>Última incidencia ({ultima.fe_regi})</Text>
            <Text style={styles.ultimaDesc} numberOfLines={3}>{ultima.inc_desc}</Text>
          </View>
        ) : (
          <Text style={styles.sinDatos}>Sin incidencias registradas para este cliente</Text>
        )}

        <TouchableOpacity
          style={styles.btnNueva}
          onPress={() => navigation.navigate('NuevaIncidencia', { ter_cote, ter_deno })}
        >
          <Text style={styles.btnNuevaText}>+ Registrar incidencia</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.historialTitulo}>Historial</Text>
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
              <View style={styles.cardHeader}>
                <Text style={styles.cardNro}>#{item.inc_codi}</Text>
                <Text style={[styles.estado, { backgroundColor: estadoColor(item.inc_estc) }]}>
                  {estadoTexto(item.inc_estc)}
                </Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.inc_desc}</Text>
              {item.inc_acci ? <Text style={styles.cardAcci}>Acción: {item.inc_acci}</Text> : null}
              <Text style={styles.cardFecha}>{item.fe_regi}</Text>
              {item.sincronizada === 0 && (
                <Text style={styles.sinSync}>Pendiente de sincronizar</Text>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.vacio}>Sin historial</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 12 },
  headerCard: {
    backgroundColor: '#1a2b4c', borderRadius: 12, padding: 14, marginBottom: 12
  },
  cliente: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  metricas: { flexDirection: 'row', marginBottom: 10 },
  metrica: { flex: 1, marginRight: 8 },
  metricaNum: { color: '#fff', fontSize: 14, fontWeight: '700' },
  metricaLbl: { color: '#c8d1e0', fontSize: 11, marginTop: 2 },
  ultima: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, marginBottom: 10 },
  ultimaTitulo: { color: '#c8d1e0', fontSize: 11, fontWeight: '600' },
  ultimaDesc: { color: '#fff', fontSize: 13, marginTop: 4 },
  sinDatos: { color: '#c8d1e0', fontSize: 13, marginBottom: 10 },
  btnNueva: {
    backgroundColor: '#27ae60', borderRadius: 8, paddingVertical: 11, alignItems: 'center'
  },
  btnNuevaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historialTitulo: { fontSize: 15, fontWeight: '700', color: '#1a2b4c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNro: { fontSize: 13, fontWeight: '700', color: '#1a2b4c' },
  estado: { color: '#fff', fontSize: 11, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  cardDesc: { fontSize: 13, color: '#555', marginTop: 6 },
  cardAcci: { fontSize: 12, color: '#1a2b4c', marginTop: 4, fontStyle: 'italic' },
  cardFecha: { fontSize: 12, color: '#999', marginTop: 4 },
  sinSync: { fontSize: 11, color: '#e67e22', fontWeight: '700', marginTop: 4 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 20, fontSize: 14 }
});