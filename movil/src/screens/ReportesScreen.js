import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, RefreshControl, TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';

function formatMoneda(v) {
  return Number(v || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

export default function ReportesScreen({ navigation }) {
  const { token } = useAuth();
  const { tema } = useTema();
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const res = await apiGet('/reportes/saldos-por-cliente', token);
      const lista = Array.isArray(res) ? res : res.value || [];
      setData(lista);
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

  const totalSaldos = data.reduce((acc, r) => acc + (Number(r.saldo_pen) || 0), 0);
  const totalDocs = data.reduce((acc, r) => acc + (Number(r.total_documentos) || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <View style={styles.totales}>
        <Text style={styles.totalLabel}>Saldos por cliente (S/.)</Text>
        <Text style={styles.totalValor}>Total pendiente: S/. {formatMoneda(totalSaldos)}</Text>
        <Text style={styles.totalSub}>Documentos: {totalDocs} | Clientes: {data.length}</Text>
      </View>

      {cargando ? (
        <Text style={[styles.vacio, { color: tema.textoSuave }]}>Cargando...</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.cob_cote}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}
              onPress={() => navigation.navigate('ClienteDetalle', {
                ter_cote: item.cob_cote,
                ter_deno: item.cliente_nombre
              })}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.nombre, { color: tema.primario }]} numberOfLines={1}>{item.cliente_nombre}</Text>
                <Text style={styles.saldo}>S/. {formatMoneda(item.saldo_pen)}</Text>
              </View>
              <Text style={[styles.detalle, { color: tema.textoSuave }]}>
                {item.total_documentos} docs | {item.total_vencidos} vencidos |
                máx {item.max_dias_vencido} días
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin datos</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  totales: { backgroundColor: '#1a2b4c', padding: 16 },
  totalLabel: { color: '#c8d1e0', fontSize: 13 },
  totalValor: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4 },
  totalSub: { color: '#c8d1e0', fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginHorizontal: 12, marginTop: 10, borderWidth: 1, borderColor: '#eee'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontSize: 15, fontWeight: '700', color: '#1a2b4c', flex: 1, marginRight: 8 },
  saldo: { fontSize: 15, fontWeight: '800', color: '#27ae60' },
  detalle: { fontSize: 12, color: '#888', marginTop: 6 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 30 }
});
