import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
  ScrollView, Modal, TextInput
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';
import DatePickerField from '../components/DatePickerField';
import ScreenContainer from '../components/ScreenContainer';

const POR_PAGINA_INC = 20;

function FiltroVendedorPopup({ vendedores, seleccionado, onSelect, color }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return vendedores;
    return vendedores.filter(v => {
      const nombre = (v.ter_deno || '').toLowerCase();
      const id = (v.ter_cote || '').toLowerCase();
      return nombre.includes(b) || id.includes(b);
    });
  }, [vendedores, busqueda]);

  return (
    <>
      <TouchableOpacity
        style={[styles.filtroSelect, { backgroundColor: seleccionado ? `${color}15` : '#f5f6fa', borderColor: seleccionado ? color : '#eee' }]}
        onPress={() => setAbierto(true)}
      >
        <Text style={{ color: seleccionado ? '#222' : '#666', fontSize: 13 }}>
          {seleccionado ? seleccionado.ter_deno : 'Seleccionar vendedor...'}
        </Text>
      </TouchableOpacity>

      <Modal visible={abierto} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vendedor</Text>
              <TouchableOpacity onPress={() => { setAbierto(false); setBusqueda(''); }}>
                <Text style={{ color: '#c0392b', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Buscar vendedor..."
              placeholderTextColor="#999"
              value={busqueda}
              onChangeText={setBusqueda}
              autoFocus
            />

            <FlatList
              data={filtrados}
              keyExtractor={(item) => String(item.ter_cote)}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const sel = seleccionado && seleccionado.ter_cote === item.ter_cote;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { backgroundColor: sel ? `${color}10` : '#fff', borderLeftWidth: 3, borderLeftColor: sel ? color : 'transparent' }]}
                    onPress={() => { onSelect(sel ? null : item); setAbierto(false); setBusqueda(''); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#222', fontSize: 14, fontWeight: sel ? '700' : '400' }}>
                        {item.ter_deno}
                      </Text>
                    </View>
                    {sel && <Text style={{ color, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Sin resultados</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function IncidenciasScreen({ navigation }) {
  const { token } = useAuth();
  const { tema } = useTema();
  const route = useRoute();
  const [pestana, setPestana] = useState('historial');
  const [incidencias, setIncidencias] = useState([]);
  const [frecuencia, setFrecuencia] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSel, setVendedorSel] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);

  const aplicarCliente = useCallback((c) => {
    if (c) setClienteSel(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.filtroCliente) {
        aplicarCliente(route.params.filtroCliente);
        route.params.filtroCliente = undefined;
      }
    }, [route.params, aplicarCliente])
  );

  const construirQuery = useCallback(() => {
    const q = [];
    if (clienteSel) q.push(`cliente=${encodeURIComponent(clienteSel.ter_cote)}`);
    if (vendedorSel) q.push(`vendedor=${encodeURIComponent(vendedorSel.ter_cote)}`);
    if (desde) q.push(`desde=${desde}`);
    if (hasta) q.push(`hasta=${hasta}`);
    return q.length ? `?${q.join('&')}` : '';
  }, [clienteSel, vendedorSel, desde, hasta]);

  const cargar = useCallback(async () => {
    try {
      const [data, freq, vend] = await Promise.all([
        apiGet(`/incidencias${construirQuery()}`, token),
        apiGet('/incidencias/frecuencia', token),
        apiGet('/clientes/vendedores', token)
      ]);
      setIncidencias(Array.isArray(data) ? data : data.value || []);
      setFrecuencia(Array.isArray(freq) ? freq : freq.value || []);
      setVendedores(Array.isArray(vend) ? vend : []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [token, construirQuery]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    setClienteSel(null);
    setVendedorSel(null);
    setMostrarHistorial(false);
  };

  const hayFiltros = desde || hasta || clienteSel || vendedorSel;

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
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: tema.fondo }]}>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: tema.primario }]}>
          <TouchableOpacity style={[styles.tab, pestana === 'historial' && { backgroundColor: tema.active }]} onPress={() => setPestana('historial')}>
            <Text style={[styles.tabText, pestana === 'historial' && { color: tema.texto }]}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, pestana === 'frecuencia' && { backgroundColor: tema.active }]} onPress={() => setPestana('frecuencia')}>
            <Text style={[styles.tabText, pestana === 'frecuencia' && { color: tema.texto }]}>Frecuencia</Text>
          </TouchableOpacity>
        </View>

        {/* Botones */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btnNueva, { backgroundColor: tema.celeste }]}
            onPress={() => navigation.navigate('NuevaIncidencia', {})}
          >
            <Text style={styles.btnNuevaText}>+ Registrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnFiltro, { backgroundColor: showFiltros ? '#2980b9' : tema.tarjeta, borderColor: tema.borde }]}
            onPress={() => setShowFiltros(!showFiltros)}
          >
            <Text style={{ color: showFiltros ? '#fff' : tema.texto, fontSize: 12, fontWeight: '600' }}>
              {showFiltros ? 'Ocultar' : 'Filtros'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtros expandibles */}
        {showFiltros && pestana === 'historial' && (
          <View style={[styles.filtros, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <View style={styles.filtrosGrid}>
              <View style={styles.filtroCol}>
                <Text style={[styles.filtroLabel, { color: tema.textoSuave }]}>Desde</Text>
                <DatePickerField value={desde} onChange={setDesde} placeholder="Fecha inicio"
                  style={{ backgroundColor: tema.fondo, borderColor: tema.borde }} />
              </View>
              <View style={styles.filtroCol}>
                <Text style={[styles.filtroLabel, { color: tema.textoSuave }]}>Hasta</Text>
                <DatePickerField value={hasta} onChange={setHasta} placeholder="Fecha fin"
                  style={{ backgroundColor: tema.fondo, borderColor: tema.borde }} />
              </View>
            </View>

            {/* Vendedor */}
            <Text style={[styles.filtroLabel, { color: tema.textoSuave, marginTop: 8 }]}>Vendedor</Text>
            <FiltroVendedorPopup
              vendedores={vendedores}
              seleccionado={vendedorSel}
              onSelect={setVendedorSel}
              color="#e67e22"
            />

            {hayFiltros && (
              <TouchableOpacity style={[styles.btnLimpiar, { backgroundColor: '#fde9ec' }]} onPress={limpiarFiltros}>
                <Text style={{ color: '#c0392b', fontSize: 12, fontWeight: '700' }}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Contenido */}
        {cargando ? (
          <Text style={[styles.vacio, { color: tema.textoSuave }]}>Cargando...</Text>
        ) : pestana === 'historial' ? (
          <>
            {/* Contador + Ver historial */}
            <View style={styles.histInfo}>
              <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
                {mostrarHistorial ? `Todas (${incidencias.length})` : `Últimas ${Math.min(POR_PAGINA_INC, incidencias.length)}`}
              </Text>
              {incidencias.length > POR_PAGINA_INC && (
                <TouchableOpacity onPress={() => setMostrarHistorial(!mostrarHistorial)}>
                  <Text style={{ color: '#2980b9', fontSize: 12, fontWeight: '700' }}>
                    {mostrarHistorial ? '← Ver menos' : `Ver historial (${incidencias.length}) →`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={mostrarHistorial ? incidencias : incidencias.slice(0, POR_PAGINA_INC)}
              keyExtractor={(item) => String(item.inc_codi)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
              renderItem={({ item }) => (
                <View style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.nro, { color: tema.primario }]}>#{item.inc_codi}</Text>
                    <View style={[styles.estado, { backgroundColor: estadoColor(item.inc_estc) }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{estadoTexto(item.inc_estc)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cliente, { color: tema.texto }]}>{item.cliente_nombre || item.ter_cote || 'Sin cliente'}</Text>
                  {item.vendedor_nombre ? <Text style={{ color: tema.textoSuave, fontSize: 12 }}>{item.vendedor_nombre}</Text> : null}
                  <Text style={[styles.desc, { color: tema.textoSuave }]} numberOfLines={2}>{item.inc_desc}</Text>
                  <Text style={[styles.fecha, { color: tema.textoSuave }]}>{item.fe_regi}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin incidencias</Text>}
            />
          </>
        ) : (
          <FlatList
            data={frecuencia}
            keyExtractor={(item, i) => String(item.ter_cote || i)}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                <Text style={[styles.cliente, { color: tema.texto }]}>{item.cliente_nombre || item.ter_cote}</Text>
                <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
                  Visitas: {item.total_incidencias} | Última: {item.ultima_visita || 'N/A'}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin datos de frecuencia</Text>}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  btnNueva: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnNuevaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnFiltro: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  filtros: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 10 },
  filtrosGrid: { flexDirection: 'row', gap: 10 },
  filtroCol: { flex: 1 },
  filtroLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  filtroSelect: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  btnLimpiar: { borderRadius: 6, paddingVertical: 8, alignItems: 'center', marginTop: 8 },
  histInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  card: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nro: { fontSize: 14, fontWeight: '700' },
  estado: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  cliente: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 13, marginTop: 4 },
  fecha: { fontSize: 11, marginTop: 4 },
  vacio: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%', backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  modalSearch: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 10, backgroundColor: '#f5f6fa' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' }
});
