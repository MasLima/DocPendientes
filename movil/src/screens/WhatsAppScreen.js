import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl,
  ActivityIndicator, TextInput, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet, apiPost } from '../api/client';
import ScreenContainer from '../components/ScreenContainer';

export default function WhatsAppScreen({ navigation }) {
  const { token } = useAuth();
  const { tema } = useTema();
  const [estado, setEstado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialFiltrado, setHistorialFiltrado] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSel, setVendedorSel] = useState(null);
  const [showFiltroVendedor, setShowFiltroVendedor] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [est, hist, vend] = await Promise.all([
        apiGet('/whatsapp/estado', token),
        apiGet('/whatsapp/historial?limit=100', token),
        apiGet('/clientes/vendedores', token)
      ]);
      setEstado(est);
      const datos = hist?.datos || [];
      setHistorial(datos);
      setHistorialFiltrado(datos);
      setVendedores(Array.isArray(vend) ? vend : []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const reconectar = async () => {
    try {
      await apiPost('/whatsapp/desconectar', {}, token);
      setTimeout(cargar, 2000);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const aplicarFiltros = useCallback(() => {
    let result = historial;
    if (busqueda.trim()) {
      const b = busqueda.trim().toLowerCase();
      result = result.filter(h =>
        (h.cliente_nombre || '').toLowerCase().includes(b) ||
        (h.telefono || '').includes(b) ||
        (h.vendedor_nombre || '').toLowerCase().includes(b)
      );
    }
    if (vendedorSel) {
      result = result.filter(h => h.vendedor_codigo === vendedorSel.ter_cote);
    }
    setHistorialFiltrado(result);
  }, [historial, busqueda, vendedorSel]);

  useFocusEffect(useCallback(() => { aplicarFiltros(); }, [aplicarFiltros]));

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color={tema.primario} /></View>;

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: tema.fondo }]}>
        {/* Estado */}
        <View style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          <View style={styles.estadoRow}>
            <View style={[styles.estadoPunto, { backgroundColor: estado?.estado === 'conectado' ? '#27ae60' : '#e74c3c' }]} />
            <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '600' }}>
              {estado?.estado === 'conectado'
                ? `Conectado: ${estado.conexion?.nombre || ''} (+51${estado.conexion?.telefono || ''})`
                : 'No conectado'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.btnReconectar, { backgroundColor: tema.primario }]} onPress={reconectar}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Reconectar</Text>
          </TouchableOpacity>
        </View>

        {/* Enviar */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tema.primario }]}>Enviar Mensajes</Text>
          <View style={styles.accesos}>
            <TouchableOpacity style={[styles.accesoBtn, { backgroundColor: '#25D366' }]} onPress={() => navigation.navigate('WhatsAppCliente')}>
              <Text style={styles.accesoText}>💬 Mensaje</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Historial */}
        <View style={styles.section}>
          <View style={styles.histHeader}>
            <Text style={[styles.sectionTitle, { color: tema.primario }]}>Historial de Envíos</Text>
            <Text style={{ color: tema.textoSuave, fontSize: 12 }}>{historialFiltrado.length} registros</Text>
          </View>

          {/* Búsqueda + Filtro vendedor */}
          <View style={styles.filtrosRow}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
              placeholder="Buscar cliente, teléfono..."
              placeholderTextColor={tema.textoSuave}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <TouchableOpacity
              style={[styles.filtroBtn, { backgroundColor: vendedorSel ? '#eef3fb' : tema.tarjeta, borderColor: tema.borde }]}
              onPress={() => setShowFiltroVendedor(true)}
            >
              <Text style={{ color: vendedorSel ? tema.primario : tema.texto, fontSize: 12, fontWeight: '600' }}>
                {vendedorSel ? vendedorSel.ter_deno.substring(0, 12) : 'Vendedor'}
              </Text>
            </TouchableOpacity>
            {vendedorSel && (
              <TouchableOpacity onPress={() => setVendedorSel(null)}>
                <Text style={{ color: '#c0392b', fontSize: 12, fontWeight: '700', paddingHorizontal: 6 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {historialFiltrado.length === 0 ? (
            <Text style={{ color: tema.textoSuave, textAlign: 'center', marginTop: 20 }}>Sin envíos registrados</Text>
          ) : (
            <FlatList
              data={historialFiltrado}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 400 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
              renderItem={({ item }) => (
                <View style={[styles.histCard, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                  <View style={styles.histTop}>
                    <Text style={[styles.histCliente, { color: tema.texto }]} numberOfLines={1}>{item.cliente_nombre || item.telefono}</Text>
                    <View style={[styles.histBadge, { backgroundColor: item.estado === 'enviado' ? '#d4edda' : '#f8d7da' }]}>
                      <Text style={{ color: item.estado === 'enviado' ? '#155724' : '#721c24', fontSize: 10, fontWeight: '700' }}>
                        {item.estado === 'enviado' ? '✓ Enviado' : '✗ Fallido'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: tema.textoSuave, fontSize: 12 }}>{item.tipo} · {item.telefono}</Text>
                  {item.vendedor_nombre ? <Text style={{ color: tema.textoSuave, fontSize: 11 }}>{item.vendedor_nombre}</Text> : null}
                  <Text style={{ color: tema.textoSuave, fontSize: 11, marginTop: 2 }}>{new Date(item.fecha_envio).toLocaleString('es-PE')}</Text>
                </View>
              )}
            />
          )}
        </View>

        {/* Modal filtro vendedor */}
        <Modal visible={showFiltroVendedor} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: tema.tarjeta }]}>
              <Text style={[styles.modalTitle, { color: tema.texto }]}>Seleccionar vendedor</Text>
              <TouchableOpacity style={styles.modalItem} onPress={() => { setVendedorSel(null); setShowFiltroVendedor(false); }}>
                <Text style={{ color: tema.texto, fontSize: 14 }}>Todos</Text>
              </TouchableOpacity>
              <FlatList
                data={vendedores}
                keyExtractor={(item) => item.ter_cote}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => { setVendedorSel(item); setShowFiltroVendedor(false); }}>
                    <Text style={{ color: tema.texto, fontSize: 14 }}>{item.ter_deno}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={[styles.modalClose, { backgroundColor: '#fde9ec' }]} onPress={() => setShowFiltroVendedor(false)}>
                <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1 },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  estadoPunto: { width: 10, height: 10, borderRadius: 5 },
  btnReconectar: { borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  accesos: { flexDirection: 'row', gap: 10 },
  accesoBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  accesoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filtrosRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  filtroBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  histCard: { borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1 },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histCliente: { fontSize: 14, fontWeight: '700', flex: 1 },
  histBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 12, padding: 16, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalClose: { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 10 }
});
