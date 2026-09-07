import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet, apiPost } from '../api/client';
import ScreenContainer from '../components/ScreenContainer';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';
const PRECIOS_CONFIG = {
  '101': { label: '02 PIEZAS 10', moneda: 'S/' },
  '102': { label: '03 SELLADO', moneda: 'S/' },
  '106': { label: '04 DOLARES', moneda: 'US$' }
};

function FiltroPopup({ titulo, items, seleccionados, onToggle, campoId, campoNombre, campoTelefono, color, requerirTelefono = false, maxItems = 50 }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return items.filter(item => {
      const nombre = (item[campoNombre] || '').toLowerCase();
      const tel = campoTelefono ? (item[campoTelefono] || '').toLowerCase() : '';
      const id = (item[campoId] || '').toLowerCase();
      return !b || nombre.includes(b) || tel.includes(b) || id.includes(b);
    }).slice(0, maxItems);
  }, [items, busqueda, campoNombre, campoTelefono, campoId, maxItems]);

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
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => {
                const sel = seleccionadosIds.includes(item[campoId]);
                const tel = campoTelefono ? item[campoTelefono] : null;
                const sinTelefono = requerirTelefono && (!tel || tel.trim() === '');
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, {
                      backgroundColor: sel ? `${color}10` : '#fff',
                      borderLeftWidth: 3, borderLeftColor: sel ? color : 'transparent',
                      opacity: sinTelefono ? 0.4 : 1
                    }]}
                    onPress={() => { if (!sinTelefono) onToggle(item); }}
                    disabled={sinTelefono}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#222', fontSize: 14, fontWeight: sel ? '700' : '400' }}>
                        {item[campoNombre] || 'Sin nombre'}
                      </Text>
                      {campoTelefono ? (
                        <Text style={{ color: sinTelefono ? '#c0392b' : '#888', fontSize: 12 }}>
                          {tel || 'Sin teléfono'}
                        </Text>
                      ) : null}
                    </View>
                    {sel && <Text style={{ color, fontSize: 16 }}>✓</Text>}
                    {sinTelefono && <Text style={{ color: '#c0392b', fontSize: 10 }}>Sin teléfono</Text>}
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

export default function WhatsAppClienteScreen({ route, navigation }) {
  const { ter_cote } = route.params || {};
  const { token } = useAuth();
  const { tema } = useTema();

  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [contactosWA, setContactosWA] = useState([]);
  const [articulos, setArticulos] = useState([]);

  const [clientesSel, setClientesSel] = useState([]);
  const [vendedoresSel, setVendedoresSel] = useState([]);
  const [empleadosSel, setEmpleadosSel] = useState([]);
  const [contactosWASel, setContactosWASel] = useState([]);
  const [articulosSel, setArticulosSel] = useState([]);
  const [telefonosAdicionales, setTelefonosAdicionales] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const [cli, vend, emp, cont, art] = await Promise.all([
        apiGet('/clientes', token),
        apiGet('/clientes/vendedores', token),
        apiGet('/whatsapp/empleados', token),
        apiGet('/whatsapp/contactos', token),
        apiGet('/articulos', token)
      ]);
      setClientes(Array.isArray(cli) ? cli : []);
      setVendedores(Array.isArray(vend) ? vend : []);
      setEmpleados(Array.isArray(emp) ? emp : []);
      setContactosWA(Array.isArray(cont) ? cont : []);
      setArticulos(Array.isArray(art) ? art : []);

      if (ter_cote) {
        const c = (Array.isArray(cli) ? cli : []).find(x => x.ter_cote === ter_cote);
        if (c) setClientesSel([c]);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
    }
  }, [token, ter_cote]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const toggleItem = (item, sel, setSel, campoId) => {
    setSel(prev => prev.find(x => x[campoId] === item[campoId])
      ? prev.filter(x => x[campoId] !== item[campoId])
      : [...prev, item]);
  };

  const telAdicionales = useMemo(() => {
    return telefonosAdicionales.split(',').map(t => t.trim()).filter(t => t.length > 0).map(t => ({ ter_cell: t, ter_deno: t, _esTelefonoAdicional: true }));
  }, [telefonosAdicionales]);

  const todosDestinos = [
    ...clientesSel.map(c => ({ ...c, _tipo: 'Cliente' })),
    ...vendedoresSel.map(v => ({ ...v, _tipo: 'Vendedor' })),
    ...empleadosSel.map(e => ({ ...e, ter_deno: e.nombre, _tipo: 'Empleado' })),
    ...contactosWASel.map(c => ({ ...c, ter_deno: c.nombre, _tipo: 'Contacto WA' })),
    ...telAdicionales
  ];

  const fmtNum = (v) => Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const generarMensajeArticulo = (art) => {
    const l = [];
    l.push(`🏷 *${art.ite_dsit || art.ite_item}*`);
    l.push(`Código: ${art.ite_item}`);
    if (art.linea_desc) l.push(`Línea: ${art.linea_desc}`);
    if (art.familia_desc) l.push(`Familia: ${art.familia_desc}`);
    if (art.saldo != null) l.push(`Saldo: ${fmtNum(art.saldo)} ${art.ustock_abrev || ''}`);
    const preciosMap = {};
    if (art.precios) art.precios.forEach(p => { preciosMap[p.ven_cota] = p; });
    Object.entries(PRECIOS_CONFIG).forEach(([code, cfg]) => {
      const p = preciosMap[code];
      if (p) l.push(`${cfg.label} (${cfg.moneda}): ${cfg.moneda} ${fmtNum(p.ven_pigv)}`);
    });
    return l.join('\n');
  };

  const toggleArticulo = (art) => {
    const existe = articulosSel.find(a => a.ite_item === art.ite_item);
    const nuevos = existe ? articulosSel.filter(a => a.ite_item !== art.ite_item) : [...articulosSel, art];
    setArticulosSel(nuevos);
    if (nuevos.length === 1) {
      setMensaje(generarMensajeArticulo(nuevos[0]));
    } else if (nuevos.length > 1) {
      const msgs = nuevos.map(a => generarMensajeArticulo(a));
      setMensaje(msgs.join('\n\n'));
    } else {
      setMensaje('');
    }
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const enviar = async () => {
    if (todosDestinos.length === 0) return Alert.alert('Info', 'Selecciona al menos un destino');
    if (!mensaje.trim() && articulosSel.length === 0) return Alert.alert('Info', 'Escribe un mensaje o selecciona artículos');

    setEnviando(true);
    setResultado(null);
    let enviados = 0, fallidos = 0;

    try {
      for (const d of todosDestinos) {
        const tel = d.ter_cell || d.ter_fono || d.telefono;
        if (!tel) { fallidos++; continue; }
        try {
          if (articulosSel.length > 0) {
            for (let i = 0; i < articulosSel.length; i++) {
              const a = articulosSel[i];
              if (i > 0) {
                setProgreso({ destino: d.ter_deno || tel, artActual: i + 1, total: articulosSel.length });
                await delay(2000);
              }
              if (articulosSel.length === 1) {
                await apiPost('/whatsapp/enviar-articulo', { telefono: tel, articulo: a, cliente: d, mensaje }, token);
              } else {
                if (a.ite_imag) {
                  await apiPost('/whatsapp/enviar-mixto', { telefono: tel, imagenUrl: `${IMG_BASE}${encodeURIComponent(a.ite_imag)}`, mensaje: generarMensajeArticulo(a) }, token);
                } else {
                  await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje: generarMensajeArticulo(a) }, token);
                }
              }
            }
          } else {
            await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje: mensaje.trim() }, token);
          }
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
        setEmpleadosSel([]);
        setContactosWASel([]);
        setArticulosSel([]);
        setTelefonosAdicionales('');
        setMensaje('');
      }
    } catch (err) {
      setResultado({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  };

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color={tema.primario} /></View>;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={[styles.container, { backgroundColor: tema.fondo }]} contentContainerStyle={{ padding: 12 }}>

          {/* Mensaje */}
          <Text style={[styles.label, { color: tema.textoSuave }]}>Mensaje</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor={tema.textoSuave}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            numberOfLines={4}
          />

          {/* Destino */}
          <Text style={[styles.label, { color: tema.textoSuave }]}>Destino</Text>
          <View style={styles.filtrosRow}>
            <FiltroPopup titulo="Clientes" items={clientes} seleccionados={clientesSel}
              onToggle={(item) => toggleItem(item, clientesSel, setClientesSel, 'ter_cote')}
              campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" color="#3498db" requerirTelefono />
            <FiltroPopup titulo="Vendedores" items={vendedores} seleccionados={vendedoresSel}
              onToggle={(item) => toggleItem(item, vendedoresSel, setVendedoresSel, 'ter_cote')}
              campoId="ter_cote" campoNombre="ter_deno" campoTelefono="ter_cell" color="#e67e22" requerirTelefono />
            <FiltroPopup titulo="Empleados" items={empleados} seleccionados={empleadosSel}
              onToggle={(item) => toggleItem(item, empleadosSel, setEmpleadosSel, 'ter_cote')}
              campoId="ter_cote" campoNombre="nombre" campoTelefono="ter_cell" color="#9b59b6" requerirTelefono />
            <FiltroPopup titulo="Contactos WA" items={contactosWA} seleccionados={contactosWASel}
              onToggle={(item) => toggleItem(item, contactosWASel, setContactosWASel, 'telefono')}
              campoId="telefono" campoNombre="nombre" campoTelefono="telefono" color="#128C7E" />
          </View>

          {/* Chips destinos - nombre y teléfono */}
          {todosDestinos.length > 0 && (
            <View style={styles.chipsContainer}>
              {clientesSel.map(c => (
                <View key={c.ter_cote} style={[styles.chip, { borderColor: '#3498db40' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{c.ter_deno} {c.ter_cell ? `(${c.ter_cell})` : ''}</Text>
                  <TouchableOpacity onPress={() => setClientesSel(prev => prev.filter(x => x.ter_cote !== c.ter_cote))}>
                    <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {vendedoresSel.map(v => (
                <View key={v.ter_cote} style={[styles.chip, { borderColor: '#e67e2240' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{v.ter_deno} {v.ter_cell ? `(${v.ter_cell})` : ''}</Text>
                  <TouchableOpacity onPress={() => setVendedoresSel(prev => prev.filter(x => x.ter_cote !== v.ter_cote))}>
                    <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {empleadosSel.map(e => (
                <View key={e.ter_cote} style={[styles.chip, { borderColor: '#9b59b640' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{e.nombre} {e.ter_cell ? `(${e.ter_cell})` : ''}</Text>
                  <TouchableOpacity onPress={() => setEmpleadosSel(prev => prev.filter(x => x.ter_cote !== e.ter_cote))}>
                    <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {contactosWASel.map(c => (
                <View key={c.telefono} style={[styles.chip, { borderColor: '#128C7E40' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{c.nombre} ({c.telefono})</Text>
                  <TouchableOpacity onPress={() => setContactosWASel(prev => prev.filter(x => x.telefono !== c.telefono))}>
                    <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {telAdicionales.map((t, i) => (
                <View key={`tel-${i}`} style={[styles.chip, { borderColor: '#7f8c8d40' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{t.ter_cell}</Text>
                  <TouchableOpacity onPress={() => setTelefonosAdicionales(prev => prev.split(',').filter((_, j) => j !== i).join(','))}>
                    <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Teléfonos adicionales */}
          <Text style={[styles.label, { color: tema.textoSuave }]}>Teléfonos adicionales</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
            placeholder="Ej: 923287233, 912345678, 998877665"
            placeholderTextColor={tema.textoSuave}
            value={telefonosAdicionales}
            onChangeText={setTelefonosAdicionales}
            keyboardType="phone-pad"
          />
          <Text style={{ fontSize: 11, color: tema.textoSuave, marginBottom: 8 }}>Separar con coma. Ej: 923287233, 912345678</Text>

          {/* Artículos */}
          <Text style={[styles.label, { color: tema.textoSuave }]}>Artículos{articulosSel.length > 0 ? ` (${articulosSel.length})` : ''}</Text>
          <FiltroPopup titulo="Seleccionar Artículos" items={articulos} seleccionados={articulosSel}
            onToggle={toggleArticulo}
            campoId="ite_item" campoNombre="ite_dsit" campoTelefono={null} color="#27ae60" />

          {articulosSel.length > 0 && (
            <View style={styles.chipsContainer}>
              {articulosSel.map(a => (
                <View key={a.ite_item} style={[styles.chip, { borderColor: '#27ae6040' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{a.ite_dsit || a.ite_item}</Text>
                  <TouchableOpacity onPress={() => toggleArticulo(a)}>
                    <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Progreso */}
          {progreso && (
            <View style={[styles.progreso, { backgroundColor: '#e8f5e9' }]}>
              <Text style={{ color: '#155724', fontSize: 12 }}>Enviando a {progreso.destino} — Art. {progreso.artActual}/{progreso.total}</Text>
            </View>
          )}

          {/* Resultado */}
          {resultado && (
            <View style={[styles.resultado, { backgroundColor: resultado.ok ? '#d4edda' : '#f8d7da' }]}>
              <Text style={{ color: resultado.ok ? '#155724' : '#721c24', fontSize: 13 }}>{resultado.texto}</Text>
            </View>
          )}

          {/* Enviar */}
          <TouchableOpacity
            style={[styles.btnEnviar, { opacity: enviando || todosDestinos.length === 0 ? 0.5 : 1 }]}
            onPress={enviar}
            disabled={enviando || todosDestinos.length === 0}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnEnviarText}>▶ Enviar a {todosDestinos.length} destino(s)</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filtroBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f6fa', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  progreso: { borderRadius: 6, padding: 8, marginBottom: 8 },
  resultado: { borderRadius: 6, padding: 10, marginBottom: 10 },
  btnEnviar: { backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  btnEnviarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '75%', backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  modalSearch: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 10, backgroundColor: '#f5f6fa' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' }
});
