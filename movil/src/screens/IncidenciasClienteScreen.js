import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';

export default function IncidenciasClienteScreen({ route, navigation }) {
  const { ter_cote, ter_deno } = route.params || {};
  const { token } = useAuth();
  const { tema } = useTema();
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
    if (inc_estc === 1) return '#f5b041';
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
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <View style={[styles.headerCard, { backgroundColor: tema.gridHeader }]}>
        <Text style={[styles.cliente, { color: tema.texto }]}>{ter_deno || ter_cote}</Text>
        {resumen.vendedor_nombre ? (
          <Text style={[styles.vendedor, { color: tema.textoSuave }]}>Vendedor: {resumen.vendedor_nombre}</Text>
        ) : null}

        <View style={styles.metricas}>
          <View style={styles.metrica}>
            <Text style={[styles.metricaNum, { color: tema.texto }]}>{resumen.total_visitas || incidencias.length || 0}</Text>
            <Text style={[styles.metricaLbl, { color: tema.textoSuave }]}>Visitas</Text>
          </View>
          <View style={styles.metrica}>
            <Text style={[styles.metricaNum, { color: tema.texto }]}>{resumen.ultima_visita || ultima?.fe_regi || '-'}</Text>
            <Text style={[styles.metricaLbl, { color: tema.textoSuave }]}>Última visita</Text>
          </View>
          <View style={styles.metrica}>
            <Text style={[styles.metricaNum, { color: tema.texto }]}>
              {resumen.promedio_dias_entre_visitas ? `~${resumen.promedio_dias_entre_visitas}d` : '-'}
            </Text>
            <Text style={[styles.metricaLbl, { color: tema.textoSuave }]}>Frecuencia</Text>
          </View>
        </View>

        {resumen.dias_desde_ultima !== undefined && (
          <Text style={styles.diasDesde}>
            {resumen.dias_desde_ultima === 0
              ? 'Visitado hoy'
              : `Hace ${resumen.dias_desde_ultima} días desde la última visita`}
          </Text>
        )}

        {ultima ? (
          <View style={[styles.ultima, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.ultimaTitulo, { color: tema.textoSuave }]}>Última incidencia ({ultima.fe_regi})</Text>
            <Text style={[styles.ultimaDesc, { color: tema.texto }]} numberOfLines={3}>{ultima.inc_desc}</Text>
            {ultima.vendedor_nombre ? (
              <Text style={[styles.ultimaVendedor, { color: tema.textoSuave }]}>por {ultima.vendedor_nombre}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.sinDatos, { color: tema.textoSuave }]}>Sin incidencias registradas para este cliente</Text>
        )}

        <TouchableOpacity
          style={[styles.btnNueva, { backgroundColor: tema.celeste }]}
          onPress={() => navigation.navigate('NuevaIncidencia', { ter_cote, ter_deno })}
        >
          <Text style={styles.btnNuevaText}>+ Registrar incidencia</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.historialTitulo, { color: tema.primario }]}>Historial</Text>
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
            <View style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardNro, { color: tema.primario }]}>#{item.inc_codi}</Text>
                <Text style={[styles.estado, { backgroundColor: estadoColor(item.inc_estc) }]}>
                  {estadoTexto(item.inc_estc)}
                </Text>
              </View>
              <Text style={[styles.cardDesc, { color: tema.texto }]} numberOfLines={2}>{item.inc_desc}</Text>
              {item.inc_acci ? <Text style={[styles.cardAcci, { color: tema.primario }]}>Acción: {item.inc_acci}</Text> : null}
              <Text style={[styles.cardFecha, { color: tema.textoSuave }]}>{item.fe_regi}</Text>
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
  container: { flex: 1, padding: 12 },
  headerCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  cliente: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  vendedor: { fontSize: 12, marginBottom: 8 },
  metricas: { flexDirection: 'row', marginBottom: 10 },
  metrica: { flex: 1, marginRight: 8 },
  metricaNum: { fontSize: 14, fontWeight: '700' },
  metricaLbl: { fontSize: 11, marginTop: 2 },
  diasDesde: { color: '#f5b041', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  ultima: { borderRadius: 8, padding: 10, marginBottom: 10 },
  ultimaTitulo: { fontSize: 11, fontWeight: '600' },
  ultimaDesc: { fontSize: 13, marginTop: 4 },
  ultimaVendedor: { fontSize: 11, marginTop: 4 },
  sinDatos: { fontSize: 13, marginBottom: 10 },
  btnNueva: {
    borderRadius: 8, paddingVertical: 11, alignItems: 'center'
  },
  btnNuevaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historialTitulo: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  card: {
    borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNro: { fontSize: 13, fontWeight: '700' },
  estado: { color: '#fff', fontSize: 11, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  cardDesc: { fontSize: 13, marginTop: 6 },
  cardAcci: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  cardFecha: { fontSize: 12, marginTop: 4 },
  sinSync: { fontSize: 11, color: '#f5b041', fontWeight: '700', marginTop: 4 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 20, fontSize: 14 }
});