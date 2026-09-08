import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert, Image,
  TouchableOpacity, ActivityIndicator, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet, apiPost } from '../api/client';
import ScreenContainer from '../components/ScreenContainer';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';
const PRECIOS_CONFIG = {
  '102': { label: '03 SELLADO', moneda: 'S/' }
};

function FiltroPopup({ titulo, items, seleccionados, onToggle, campoId, campoNombre, campoTelefono, color, requerirTelefono }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const filtrados = items.filter(item => {
    const b = busqueda.trim().toLowerCase();
    const nombre = (item[campoNombre] || '').toLowerCase();
    const tel = campoTelefono ? (item[campoTelefono] || '').toLowerCase() : '';
    const id = (item[campoId] || '').toLowerCase();
    return !b || nombre.includes(b) || tel.includes(b) || id.includes(b);
  }).slice(0, 50);

  const seleccionadosIds = seleccionados.map(s => s[campoId]);

  return (
    <>
      <TouchableOpacity
        style={[styles.filtroBtn, { backgroundColor: seleccionados.length > 0 ? `${color}15` : '#f5f6fa', borderColor: seleccionados.length > 0 ? color : '#eee' }]}
        onPress={() => setAbierto(true)}
      >
        <Text style={{ color: seleccionados.length > 0 ? color : '#666', fontSize: 12, fontWeight: '600' }}>
          {titulo}{seleccionados.length > 0 ? ` (${seleccionados.length})` : ''}
        </Text>
      </TouchableOpacity>

      <Modal visible={abierto} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{titulo}</Text>
              <TouchableOpacity onPress={() => { setAbierto(false); setBusqueda(''); }}>
                <Text style={{ color: '#c0392b', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder={`Buscar ${titulo.toLowerCase()}...`}
              placeholderTextColor="#999"
              value={busqueda}
              onChangeText={setBusqueda}
              autoFocus
            />
            <FlatList
              data={filtrados}
              keyExtractor={(item) => String(item[campoId])}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const sel = seleccionadosIds.includes(item[campoId]);
                const tieneTel = campoTelefono ? !!item[campoTelefono] : true;
                const bloqueado = requerirTelefono && !tieneTel;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { backgroundColor: sel ? `${color}10` : '#fff', borderLeftWidth: 3, borderLeftColor: sel ? color : 'transparent', opacity: bloqueado ? 0.4 : 1 }]}
                    onPress={() => { if (!bloqueado) onToggle(item); }}
                    disabled={bloqueado}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#222', fontSize: 14, fontWeight: sel ? '700' : '400' }}>
                        {item[campoNombre] || 'Sin nombre'}
                      </Text>
                      {campoTelefono ? (
                        <Text style={{ color: tieneTel ? '#888' : '#c0392b', fontSize: 12 }}>
                          {item[campoTelefono] || 'Sin teléfono'}
                        </Text>
                      ) : null}
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

export default function ArticuloDetalleScreen({ route, navigation }) {
  const { codigo } = route.params || {};
  const { token } = useAuth();
  const { tema } = useTema();
  const [art, setArt] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pestana, setPestana] = useState('imagen');

  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [clientesSel, setClientesSel] = useState([]);
  const [vendedoresSel, setVendedoresSel] = useState([]);
  const [telAdicionales, setTelAdicionales] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet(`/articulos/${codigo}`, token);
      setArt(data);
      const [cli, vend] = await Promise.all([
        apiGet('/clientes', token),
        apiGet('/clientes/vendedores', token)
      ]);
      setClientes(Array.isArray(cli) ? cli : []);
      setVendedores(Array.isArray(vend) ? vend : []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [token, codigo]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color={tema.primario} /></View>;
  if (!art) return <View style={styles.center}><Text style={{ color: tema.textoSuave }}>Artículo no encontrado</Text></View>;

  const imagenUrl = art.ite_imag ? `${IMG_BASE}${encodeURIComponent(art.ite_imag)}` : null;

  const fmt = (desc, abrev) => {
    if (desc && abrev) return `${desc} (${abrev})`;
    return desc || abrev || '-';
  };
  const uStock = fmt(art.ustock_desc, art.ustock_abrev);
  const fmtNum = (v) => Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum3 = (v) => Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtFecha = (f) => {
    if (!f) return '-';
    try { return new Date(f).toLocaleDateString('es-PE'); } catch { return f; }
  };

  const precios = art.precios || [];
  const preciosMap = {};
  precios.forEach(p => { preciosMap[p.ven_cota] = p; });

  const generarMensaje = () => {
    const l = [];
    l.push(`🏷 *${art.ite_dsit || art.ite_item}*`);
    l.push(`Código: ${art.ite_item}`);
    if (art.linea_desc) l.push(`Línea: ${art.linea_desc}`);
    if (art.familia_desc) l.push(`Familia: ${art.familia_desc}`);
    if (art.saldo != null) l.push(`STOCK: ${fmtNum(art.saldo)} ${art.ustock_abrev || ''}`);
    const p = preciosMap['102'];
    if (p) l.push(`03 SELLADO S/${fmtNum3(p.ven_pigv)}`);
    return l.join('\n');
  };

  const toggleItem = (item, setSel, campoId) => {
    setSel(prev => prev.find(x => x[campoId] === item[campoId])
      ? prev.filter(x => x[campoId] !== item[campoId])
      : [...prev, item]);
  };

  const todosDestinos = [
    ...clientesSel.map(c => ({ ...c, _tipo: 'Cliente' })),
    ...vendedoresSel.map(v => ({ ...v, _tipo: 'Vendedor' })),
    ...telAdicionales.split(',').map(t => t.trim()).filter(Boolean).map(t => ({ ter_cell: t, ter_deno: t, _tipo: 'Contacto' }))
  ];

  const enviarWhatsApp = async () => {
    if (todosDestinos.length === 0) return Alert.alert('Info', 'Selecciona al menos un destino');
    if (!mensaje.trim()) return Alert.alert('Info', 'Escribe un mensaje');

    setEnviando(true);
    setResultado(null);
    let enviados = 0, fallidos = 0;

    try {
      for (const d of todosDestinos) {
        const tel = d.ter_cell || d.ter_fono || d.telefono;
        if (!tel) { fallidos++; continue; }
        try {
          await apiPost('/whatsapp/enviar-articulo', { telefono: tel, articulo: art, cliente: d, mensaje: mensaje.trim() }, token);
          enviados++;
        } catch { fallidos++; }
      }
      setResultado({
        ok: enviados > 0,
        texto: enviados > 0
          ? `✓ Enviado a ${enviados} destino(s)${fallidos > 0 ? `, ${fallidos} sin número` : ''}`
          : 'No se pudo enviar'
      });
      if (enviados > 0) {
        setClientesSel([]);
        setVendedoresSel([]);
      }
    } catch (err) {
      setResultado({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const TabBtn = ({ clave, label }) => (
    <TouchableOpacity
      style={[styles.tab, pestana === clave && { borderBottomColor: tema.active }]}
      onPress={() => setPestana(clave)}
    >
      <Text style={{ color: pestana === clave ? tema.primario : tema.tabInactivo, fontWeight: pestana === clave ? '700' : '400', fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const Campo = ({ label, valor }) => (
    <View style={[styles.campo, { backgroundColor: tema.fondo }]}>
      <Text style={[styles.campoLabel, { color: tema.textoSuave }]}>{label}</Text>
      <Text style={[styles.campoValor, { color: tema.texto }]}>{valor || '-'}</Text>
    </View>
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={[styles.container, { backgroundColor: tema.fondo }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
        >
          {/* Encabezado */}
          <View style={[styles.header, { backgroundColor: tema.gridHeader, borderColor: tema.borde }]}>
            <View style={styles.headerTop}>
              <Text style={[styles.headerCodigo, { color: tema.textoSuave }]}>{art.ite_item}</Text>
              {art.ite_codi ? <Text style={[styles.headerCodigo, { color: tema.textoSuave }]}>Alt: {art.ite_codi}</Text> : null}
            </View>
            <Text style={[styles.headerNombre, { color: tema.texto }]}>{art.ite_dsit}</Text>
            <View style={styles.headerSaldo}>
              <Text style={[styles.saldoNum, { color: art.saldo > 0 ? '#27ae60' : '#e74c3c' }]}>
                {fmtNum(art.saldo)}
              </Text>
              {art.ustock_abrev ? <Text style={[styles.saldoUnd, { color: tema.textoSuave }]}>{art.ustock_abrev}</Text> : null}
            </View>
          </View>

          {/* Botón WhatsApp */}
          <TouchableOpacity
            style={[styles.btnWhatsApp, { backgroundColor: '#25D366' }]}
            onPress={() => {
              if (!showWhatsApp) setMensaje(generarMensaje());
              setShowWhatsApp(!showWhatsApp);
            }}
          >
            <Text style={styles.btnWhatsAppText}>
              {showWhatsApp ? '✕ Cerrar' : '📱 Enviar por WhatsApp'}
            </Text>
          </TouchableOpacity>

          {/* Sección WhatsApp */}
          {showWhatsApp && (
            <View style={[styles.waSection, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
              <Text style={[styles.waLabel, { color: tema.textoSuave }]}>Mensaje</Text>
              <TextInput
                style={[styles.waInput, styles.waTextArea, { backgroundColor: tema.fondo, borderColor: tema.borde, color: tema.texto }]}
                value={mensaje}
                onChangeText={setMensaje}
                multiline
                numberOfLines={5}
              />

              <Text style={[styles.waLabel, { color: tema.textoSuave }]}>Destino</Text>
              <View style={styles.waFiltros}>
                <FiltroPopup titulo="Clientes" items={clientes} seleccionados={clientesSel}
                  onToggle={(item) => toggleItem(item, setClientesSel, 'ter_cote')}
                  campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" color="#3498db" requerirTelefono />
                <FiltroPopup titulo="Vendedores" items={vendedores} seleccionados={vendedoresSel}
                  onToggle={(item) => toggleItem(item, setVendedoresSel, 'ter_cote')}
                  campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" color="#e67e22" requerirTelefono />
              </View>

              <TextInput
                style={[styles.waInput, { backgroundColor: tema.fondo, borderColor: tema.borde, color: tema.texto }]}
                placeholder="Teléfonos adicionales (separados por coma)"
                placeholderTextColor="#999"
                value={telAdicionales}
                onChangeText={setTelAdicionales}
              />

              {todosDestinos.length > 0 && (
                <View style={styles.waChips}>
                  {clientesSel.map(c => (
                    <View key={c.ter_cote} style={[styles.waChip, { borderColor: '#3498db40' }]}>
                      <Text style={{ color: '#222', fontSize: 11 }}>{c.ter_deno} {c.ter_cell ? `· ${c.ter_cell}` : ''}</Text>
                      <TouchableOpacity onPress={() => setClientesSel(prev => prev.filter(x => x.ter_cote !== c.ter_cote))}>
                        <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {vendedoresSel.map(v => (
                    <View key={v.ter_cote} style={[styles.waChip, { borderColor: '#e67e2240' }]}>
                      <Text style={{ color: '#222', fontSize: 11 }}>{v.ter_deno} {v.ter_cell ? `· ${v.ter_cell}` : ''}</Text>
                      <TouchableOpacity onPress={() => setVendedoresSel(prev => prev.filter(x => x.ter_cote !== v.ter_cote))}>
                        <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {telAdicionales.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                    <View key={`tel-${i}`} style={[styles.waChip, { borderColor: '#88888840' }]}>
                      <Text style={{ color: '#222', fontSize: 11 }}>{t}</Text>
                      <TouchableOpacity onPress={() => {
                        const parts = telAdicionales.split(',').map(x => x.trim()).filter(Boolean);
                        parts.splice(i, 1);
                        setTelAdicionales(parts.join(', '));
                      }}>
                        <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {resultado && (
                <View style={[styles.waResultado, { backgroundColor: resultado.ok ? '#d4edda' : '#f8d7da' }]}>
                  <Text style={{ color: resultado.ok ? '#155724' : '#721c24', fontSize: 12 }}>{resultado.texto}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btnEnviarWA, { opacity: enviando || todosDestinos.length === 0 ? 0.5 : 1 }]}
                onPress={enviarWhatsApp}
                disabled={enviando || todosDestinos.length === 0}
              >
                {enviando ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnEnviarText}>▶ Enviar a {todosDestinos.length} destino(s)</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabs}>
            <TabBtn clave="imagen" label="Imagen" />
            <TabBtn clave="datos" label="Datos" />
            <TabBtn clave="precios" label="Precios" />
          </View>

          {/* Tab Imagen */}
          {pestana === 'imagen' && (
            <View style={styles.tabContent}>
              {imagenUrl ? (
                <View style={[styles.imgContainer, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                  <Image source={{ uri: imagenUrl }} style={styles.img} resizeMode="contain" />
                  <Text style={[styles.imgName, { color: tema.textoSuave }]}>{art.ite_imag}</Text>
                </View>
              ) : (
                <View style={[styles.sinImg, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                  <Text style={{ color: tema.textoSuave }}>Sin imagen</Text>
                </View>
              )}

              <View style={styles.camposGrid}>
                <Campo label="Línea" valor={art.linea_desc} />
                <Campo label="Familia" valor={art.familia_desc} />
              </View>
              <View style={styles.camposGrid}>
                <Campo label="Fecha Últ. Compra" valor={fmtFecha(art.fecha_compra)} />
                <Campo label="Importe Compra" valor={art.importe_compra != null ? `S/ ${fmtNum3(art.importe_compra)}` : '-'} />
              </View>
              <View style={styles.camposGrid}>
                <Campo label="Fecha Últ. Venta" valor={fmtFecha(art.ite_feuv)} />
                <Campo label="U. Medida Stock" valor={uStock} />
              </View>
            </View>
          )}

          {/* Tab Datos */}
          {pestana === 'datos' && (
            <View style={styles.tabContent}>
              <View style={styles.camposGrid}>
                <Campo label="Unidad Venta" valor={fmt(art.uventa_desc, art.uventa_abrev)} />
                <Campo label="Unidad Compra" valor={fmt(art.ucompra_desc, art.ucompra_abrev)} />
              </View>
              <View style={styles.camposGrid}>
                <Campo label="Última Sync" valor={fmtFecha(art.ultima_sync)} />
              </View>
              {art.ite_dste ? (
                <View style={[styles.descLarga, { backgroundColor: tema.fondo }]}>
                  <Text style={[styles.campoLabel, { color: tema.textoSuave }]}>Descripción larga</Text>
                  <Text style={{ color: tema.texto, fontSize: 13, marginTop: 4 }}>{art.ite_dste}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Tab Precios */}
          {pestana === 'precios' && (
            <View style={styles.tabContent}>
              {precios.length === 0 ? (
                <Text style={{ color: tema.textoSuave, textAlign: 'center', marginTop: 20 }}>Sin precios registrados</Text>
              ) : (
                Object.entries(PRECIOS_CONFIG).map(([code, cfg]) => {
                  const p = preciosMap[code];
                  return (
                    <View key={code} style={[styles.precioRow, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                      <Text style={[styles.precioLabel, { color: tema.texto }]}>{cfg.label} ({cfg.moneda})</Text>
                      <Text style={[styles.precioMonto, { color: '#27ae60' }]}>{cfg.moneda} {p ? fmtNum3(p.ven_pigv) : '-'}</Text>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { margin: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between' },
  headerCodigo: { fontSize: 12, fontFamily: 'monospace' },
  headerNombre: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  headerSaldo: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  saldoNum: { fontSize: 22, fontWeight: '800' },
  saldoUnd: { fontSize: 14 },
  btnWhatsApp: { marginHorizontal: 12, marginBottom: 10, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnWhatsAppText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  waSection: { marginHorizontal: 12, marginBottom: 10, borderRadius: 10, borderWidth: 1, padding: 12 },
  waLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  waInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  waTextArea: { height: 120, textAlignVertical: 'top' },
  waFiltros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filtroBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  waChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  waChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f6fa', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  waResultado: { borderRadius: 6, padding: 8, marginBottom: 8 },
  btnEnviarWA: { backgroundColor: '#25D366', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnEnviarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginHorizontal: 12 },
  tab: { paddingVertical: 10, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabContent: { padding: 12 },
  imgContainer: { borderRadius: 10, borderWidth: 1, padding: 8, marginBottom: 12 },
  img: { width: '100%', height: 180, borderRadius: 8 },
  imgName: { textAlign: 'center', fontSize: 11, fontFamily: 'monospace', marginTop: 6 },
  sinImg: { borderRadius: 10, borderWidth: 1, height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  camposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  campo: { flex: 1, minWidth: '45%', borderRadius: 8, padding: 10 },
  campoLabel: { fontSize: 11, fontWeight: '600' },
  campoValor: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  descLarga: { borderRadius: 8, padding: 10, marginTop: 4 },
  precioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 8 },
  precioLabel: { fontSize: 14, fontWeight: '600' },
  precioMonto: { fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%', backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  modalSearch: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 10, backgroundColor: '#f5f6fa' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' }
});
