import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
  TextInput, ScrollView
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';
import DatePickerField from '../components/DatePickerField';
import ScreenContainer from '../components/ScreenContainer';

export default function IncidenciasScreen({ navigation }) {
  const { token } = useAuth();
  const { tema } = useTema();
  const route = useRoute();
  const [pestana, setPestana] = useState('historial');
  const [incidencias, setIncidencias] = useState([]);
  const [frecuencia, setFrecuencia] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clienteSel, setClienteSel] = useState(null);

  // Aplica el cliente elegido desde ElegirClienteScreen.
  const aplicarCliente = useCallback((c) => {
    if (c) {
      setClienteSel(c);
      setFiltroCliente(c.ter_cote);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.filtroCliente) {
        aplicarCliente(route.params.filtroCliente);
        // Evitar volver a aplicar el mismo en cada focus:
        route.params.filtroCliente = undefined;
      }
    }, [route.params, aplicarCliente])
  );

  const construirQuery = useCallback(() => {
    const q = [];
    if (filtroCliente) q.push(`cliente=${encodeURIComponent(filtroCliente)}`);
    if (desde) q.push(`desde=${desde}`);
    if (hasta) q.push(`hasta=${hasta}`);
    return q.length ? `?${q.join('&')}` : '';
  }, [filtroCliente, desde, hasta]);

  const cargar = useCallback(async () => {
    try {
      const [data, freq] = await Promise.all([
        apiGet(`/incidencias${construirQuery()}`, token),
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
  }, [token, construirQuery]);

  useFocusEffect(
    useCallback(() => { cargar(); }, [cargar])
  );

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    setFiltroCliente('');
    setClienteSel(null);
  };

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

  const hayFiltros = desde || hasta || filtroCliente;

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: tema.fondo }]}>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, pestana === 'historial' && styles.tabActiva]} onPress={() => setPestana('historial')}>
            <Text style={[styles.tabText, pestana === 'historial' && styles.tabTextActiva]}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, pestana === 'frecuencia' && styles.tabActiva]} onPress={() => setPestana('frecuencia')}>
            <Text style={[styles.tabText, pestana === 'frecuencia' && styles.tabTextActiva]}>Frecuencia</Text>
          </TouchableOpacity>
        </View>

      <TouchableOpacity
        style={styles.btnNueva}
        onPress={() => navigation.navigate('NuevaIncidencia', {})}
      >
        <Text style={styles.btnNuevaText}>+ Registrar incidencia</Text>
      </TouchableOpacity>

      {pestana === 'historial' && (
        <View style={styles.filtros}>
          <Text style={[styles.filtrosTitulo, { color: tema.textoSuave }]}>Filtros</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtrosRow}>
              <DatePickerField
                value={desde}
                onChange={setDesde}
                placeholder="Desde"
                style={{ backgroundColor: tema.tarjeta, borderColor: tema.borde }}
              />
              <DatePickerField
                value={hasta}
                onChange={setHasta}
                placeholder="Hasta"
                style={{ backgroundColor: tema.tarjeta, borderColor: tema.borde }}
              />
              {clienteSel ? (
                <TouchableOpacity style={[styles.clienteFiltro, { backgroundColor: tema.fondo }]} onPress={() => { setClienteSel(null); setFiltroCliente(''); }}>
                  <Text style={[styles.clienteFiltroText, { color: tema.primario }]} numberOfLines={1}>
                    {clienteSel.ter_deno} ({clienteSel.ter_cote}) ✕
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.clienteFiltro, { backgroundColor: tema.fondo }]}
                  onPress={() => navigation.navigate('ElegirCliente', {})}
                >
                  <Text style={[styles.clienteFiltroText, { color: tema.primario }]}>Filtrar por cliente ▾</Text>
                </TouchableOpacity>
              )}
              {hayFiltros && (
                <TouchableOpacity style={styles.btnLimpiar} onPress={limpiarFiltros}>
                  <Text style={styles.btnLimpiarText}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {cargando ? (
        <Text style={[styles.vacio, { color: tema.textoSuave }]}>Cargando...</Text>
      ) : pestana === 'historial' ? (
        <FlatList
          data={incidencias}
          keyExtractor={(item) => String(item.inc_codi)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
              <View style={styles.headerRow}>
                <Text style={[styles.nro, { color: tema.primario }]}>#{item.inc_codi}</Text>
                <Text style={[styles.estado, { backgroundColor: estadoColor(item.inc_estc) }]}>
                  {estadoTexto(item.inc_estc)}
                </Text>
              </View>
              <Text style={[styles.cliente, { color: tema.texto }]}>{item.cliente_nombre || item.ter_cote || 'Sin cliente'}</Text>
              <Text style={[styles.desc, { color: tema.textoSuave }]} numberOfLines={2}>{item.inc_desc}</Text>
              <Text style={[styles.fecha, { color: tema.textoSuave }]}>{item.fe_regi}</Text>
              {item.sincronizada === 0 && (
                <Text style={styles.sinSync}>Pendiente de sincronizar</Text>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>No hay incidencias con esos filtros</Text>}
        />
      ) : (
        <FlatList
          data={frecuencia}
          keyExtractor={(item) => String(item.ter_cote)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}
              onPress={() => navigation.navigate('IncidenciasCliente', { ter_cote: item.ter_cote, ter_deno: item.cliente_nombre })}
            >
              <View style={styles.headerRow}>
                <Text style={[styles.cliente, { color: tema.texto }]} numberOfLines={1}>{item.cliente_nombre || item.ter_cote}</Text>
                <Text style={[styles.freqItem, { color: tema.primario }]}>
                  {item.dias_desde_ultima === 0 ? 'hoy' : `hace ${item.dias_desde_ultima} d`}
                </Text>
              </View>
              <Text style={[styles.freqVendedor, { color: tema.textoSuave }]}>
                Vendedor: {item.vendedor_nombre || item.ter_cote}
              </Text>
              <View style={styles.freqRow}>
                <Text style={[styles.freqItem, { color: tema.primario }]}>{item.total_visitas} visitas</Text>
                <Text style={[styles.freqItem, { color: tema.primario }]}>última: {item.ultima_visita || '-'}</Text>
              </View>
              {item.ultima_desc ? (
                <Text style={[styles.desc, { color: tema.textoSuave }]} numberOfLines={2}>
                  Última: {item.ultima_desc}
                </Text>
              ) : null}
              <View style={styles.freqRow}>
                <Text style={[styles.freqSub, { color: tema.textoSuave }]}>
                  {item.promedio_dias_entre_visitas ? `cada ~${item.promedio_dias_entre_visitas} d` : '-'}
                </Text>
                <Text style={[styles.freqSub, { color: tema.textoSuave }]}>últimos 30 d: {item.visitas_ultimos_30 || 0}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin frecuencia de visitas</Text>}
        />
      )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#1a2b4c', borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActiva: { backgroundColor: '#fff' },
  tabText: { color: '#c8d1e0', fontSize: 14, fontWeight: '600' },
  tabTextActiva: { color: '#1a2b4c' },
  btnNueva: {
    backgroundColor: '#1a2b4c', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginBottom: 10
  },
  btnNuevaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  filtros: { marginBottom: 10 },
  filtrosTitulo: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 4 },
  filtrosRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  inputFecha: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, minWidth: 150
  },
  clienteFiltro: {
    backgroundColor: '#eef3fb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    justifyContent: 'center', maxWidth: 220
  },
  clienteFiltroText: { fontSize: 13, fontWeight: '600', color: '#1a2b4c' },
  btnLimpiar: {
    backgroundColor: '#fdecea', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    justifyContent: 'center'
  },
  btnLimpiarText: { fontSize: 13, fontWeight: '700', color: '#c0392b' },
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
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  freqVendedor: { fontSize: 12, marginTop: 4 },
  freqItem: { fontSize: 13, fontWeight: '700', color: '#1a2b4c' },
  freqSub: { fontSize: 12, color: '#888' },
  vacio: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 15 }
});