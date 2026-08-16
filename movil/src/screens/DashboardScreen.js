import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

function fmt(v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardScreen() {
  const { token, user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [porVendedor, topClientes, antiguedad, incidencias] = await Promise.all([
        apiGet('/dashboard/saldos-por-vendedor', token),
        apiGet('/dashboard/top-clientes', token),
        apiGet('/dashboard/documentos-antiguedad', token),
        apiGet('/dashboard/incidencias-resumen', token)
      ]);
      setDatos({
        porVendedor: Array.isArray(porVendedor) ? porVendedor : porVendedor.value || [],
        topClientes: Array.isArray(topClientes) ? topClientes : topClientes.value || [],
        antiguedad: Array.isArray(antiguedad) ? antiguedad[0] : antiguedad,
        incidencias: incidencias || {}
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => { cargar(); }, [cargar])
  );

  if (!datos) {
    return <View style={styles.center}><Text style={styles.vacio}>Cargando dashboard...</Text></View>;
  }

  const a = datos.antiguedad || {};
  const totalDocs = a.total || 0;
  const inc = datos.incidencias || {};

  const Card = ({ title, children }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
    >
      <Text style={styles.bienvenida}>Bienvenido, {user?.nombre || user?.use_logi}</Text>
      <Text style={styles.rol}>Perfil: {user?.rol}</Text>

      {/* Antiguedad de vencimiento */}
      <Card title="Documentos por antigüedad de vencimiento">
        <View style={styles.barras}>
          <Barra label="Al día" n={a.al_dia} total={totalDocs} color="#27ae60" />
          <Barra label="1-30 d" n={a.de_1_30} total={totalDocs} color="#e67e22" />
          <Barra label="31-60 d" n={a.de_31_60} total={totalDocs} color="#d35400" />
          <Barra label="61-90 d" n={a.de_61_90} total={totalDocs} color="#c0392b" />
          <Barra label="+90 d" n={a.mas_90} total={totalDocs} color="#8e44ad" />
        </View>
        <Text style={styles.totalDoc}>Total documentos: {totalDocs}</Text>
      </Card>

      {/* Top clientes deudores */}
      <Card title="Top clientes deudores">
        {(datos.topClientes || []).slice(0, 5).map((c, i) => (
          <View key={c.cob_cote} style={styles.fila}>
            <Text style={styles.pos}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre} numberOfLines={1}>{c.cliente_nombre}</Text>
              <Text style={styles.sub}>S/. {fmt(c.saldo_pen)} {c.saldo_usd ? `| US$ ${fmt(c.saldo_usd)}` : ''}</Text>
            </View>
            <Text style={styles.dias}>{c.max_dias_vencido > 0 ? `${c.max_dias_vencido} d venc` : 'al día'}</Text>
          </View>
        ))}
      </Card>

      {/* Saldos por vendedor */}
      <Card title="Saldos por vendedor">
        {(datos.porVendedor || []).slice(0, 5).map((v) => (
          <View key={v.ter_cote} style={styles.fila}>
            <Text style={styles.pos}>•</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre} numberOfLines={1}>{v.vendedor_nombre}</Text>
              <Text style={styles.sub}>{v.num_clientes} clientes | {v.total_documentos} docs</Text>
            </View>
            <Text style={styles.saldo}>S/. {fmt(v.saldo_pen)}</Text>
          </View>
        ))}
      </Card>

      {/* Incidencias y frecuencia */}
      <Card title="Incidencias y frecuencia de visitas">
        <View style={styles.totales}>
          <View style={styles.totalCaja}>
            <Text style={styles.totalNum}>{inc.totales?.total_incidencias || 0}</Text>
            <Text style={styles.totalLbl}>Incidencias</Text>
          </View>
          <View style={styles.totalCaja}>
            <Text style={styles.totalNum}>{inc.totales?.clientes_visitados || 0}</Text>
            <Text style={styles.totalLbl}>Clientes visitados</Text>
          </View>
        </View>
        {(inc.resumen || []).slice(0, 5).map((r) => (
          <View key={r.ter_cote} style={styles.fila}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre} numberOfLines={1}>{r.cliente_nombre || r.ter_cote}</Text>
              <Text style={styles.sub}>
                {r.total_incidencias} visitas | última: {r.ultima_visita || '-'}
              </Text>
            </View>
            <Text style={styles.dias}>
              {r.promedio_dias ? `cada ~${r.promedio_dias} d` : '-'}
            </Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function Barra({ label, n, total, color }) {
  const pct = total > 0 ? Math.round(((n || 0) / total) * 100) : 0;
  return (
    <View style={styles.barraRow}>
      <Text style={styles.barraLabel}>{label}</Text>
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barraVal}>{n || 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' },
  vacio: { color: '#888', fontSize: 15 },
  bienvenida: { fontSize: 20, fontWeight: '800', color: '#1a2b4c', paddingHorizontal: 16, paddingTop: 16 },
  rol: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginTop: 2, marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: '#eee'
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a2b4c', marginBottom: 10 },
  barras: { marginBottom: 6 },
  barraRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  barraLabel: { width: 52, fontSize: 12, color: '#666' },
  barraTrack: { flex: 1, height: 14, backgroundColor: '#eee', borderRadius: 7, overflow: 'hidden', marginHorizontal: 8 },
  barraFill: { height: 14, borderRadius: 7 },
  barraVal: { width: 32, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#333' },
  totalDoc: { fontSize: 12, color: '#888', marginTop: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pos: { width: 24, fontSize: 14, fontWeight: '800', color: '#1a2b4c' },
  nombre: { fontSize: 14, fontWeight: '600', color: '#222' },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  dias: { fontSize: 12, color: '#c0392b', fontWeight: '600', marginLeft: 8 },
  saldo: { fontSize: 13, fontWeight: '800', color: '#27ae60', marginLeft: 8 },
  totales: { flexDirection: 'row', marginBottom: 8 },
  totalCaja: { flex: 1, backgroundColor: '#f0f4fb', borderRadius: 10, padding: 12, marginRight: 8 },
  totalNum: { fontSize: 22, fontWeight: '800', color: '#1a2b4c' },
  totalLbl: { fontSize: 12, color: '#666', marginTop: 2 }
});