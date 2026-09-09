import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl,
  TextInput, ActivityIndicator, Modal, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet, apiPost } from '../api/client';
import API_URL from '../config';
import * as DocumentPicker from 'expo-document-picker';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';
const PRECIOS_CONFIG = {
  '102': { label: '03 SELLADO', moneda: 'S/' }
};

function formatMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function estadoTexto(inc_estc) {
  if (inc_estc === 1) return 'Registrada';
  if (inc_estc === 2) return 'En proceso';
  if (inc_estc === 3) return 'Resuelta';
  return 'Desconocido';
}

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

export default function ClienteDetalleScreen({ route, navigation }) {
  const { ter_cote, ter_deno } = route.params;
  const { token } = useAuth();
  const { tema } = useTema();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [incidencias, setIncidencias] = useState([]);
  const [verTodasIncidencias, setVerTodasIncidencias] = useState(false);
  const [cargandoIncidencias, setCargandoIncidencias] = useState(false);

  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [telOrigen, setTelOrigen] = useState('');
  const [articulos, setArticulos] = useState([]);
  const [articulosSel, setArticulosSel] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [archivosSel, setArchivosSel] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await apiGet(`/clientes/${ter_cote}`, token);
      setData(res);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRefreshing(false);
    }
  }, [ter_cote, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (!data) {
    return <View style={styles.container}><Text style={styles.vacio}>Cargando...</Text></View>;
  }

  const { cliente, resumen, documentos, ultima_incidencia } = data;

  const cargarIncidencias = async () => {
    if (incidencias.length > 0 && !verTodasIncidencias) {
      setVerTodasIncidencias(true);
      return;
    }
    if (incidencias.length > 0 && verTodasIncidencias) {
      setVerTodasIncidencias(false);
      return;
    }
    setCargandoIncidencias(true);
    try {
      const data = await apiGet(`/incidencias?cliente=${ter_cote}`, token);
      const lista = Array.isArray(data) ? data : data.value || [];
      setIncidencias(lista);
      setVerTodasIncidencias(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargandoIncidencias(false);
    }
  };

  const abrirWhatsApp = async () => {
    setShowWhatsApp(true);
    if (articulos.length === 0) {
      try {
        const [art, wa] = await Promise.all([
          apiGet('/articulos', token),
          apiGet('/whatsapp/estado', token)
        ]);
        setArticulos(Array.isArray(art) ? art : []);
        setTelOrigen(wa?.conexion?.telefono || '');
      } catch { /* ignore */ }
    }
  };

  const toggleArticulo = (item) => {
    setArticulosSel(prev => {
      const exists = prev.find(a => a.ite_item === item.ite_item);
      if (exists) return prev.filter(a => a.ite_item !== item.ite_item);
      const nuevos = [...prev, item];
      if (nuevos.length === 1) {
        setMensaje(generarMensajeArticulo(nuevos[0]));
      }
      return nuevos;
    });
  };

  const generarMensajeArticulo = (a) => {
    const l = [];
    l.push(`🏷 *${a.ite_dsit || a.ite_item}*`);
    l.push(`Código: ${a.ite_item}`);
    if (a.linea_desc) l.push(`Línea: ${a.linea_desc}`);
    if (a.familia_desc) l.push(`Familia: ${a.familia_desc}`);
    if (a.saldo != null) l.push(`STOCK: ${Number(a.saldo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${a.ustock_abrev || ''}`);
    const precios = a.precios || [];
    const p102 = precios.find(p => p.ven_cota === '102');
    if (p102) l.push(`03 SELLADO S/${Number(p102.ven_pigv || 0).toLocaleString('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`);
    return l.join('\n');
  };

  const subirArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('archivo', {
        uri: file.uri,
        name: file.name || 'archivo',
        type: file.mimeType || 'application/octet-stream'
      });
      const res = await fetch(`${API_URL}/whatsapp/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.ruta) setArchivosSel(prev => [...prev, { nombre: data.nombre, ruta: data.ruta, tamano: data.tamano }]);
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir el archivo');
    }
  };

  const enviarWhatsApp = async () => {
    const tel = cliente.ter_cell || cliente.ter_fono;
    if (!tel) return Alert.alert('Info', 'El cliente no tiene teléfono');
    if (archivosSel.length === 0 && articulosSel.length === 0 && !mensaje.trim()) return Alert.alert('Info', 'Escribe un mensaje o selecciona contenido');

    setEnviando(true);
    setResultado(null);
    try {
      if (articulosSel.length > 0) {
        for (let i = 0; i < articulosSel.length; i++) {
          const a = articulosSel[i];
          if (i > 0) await new Promise(r => setTimeout(r, 2000));
          if (articulosSel.length === 1) {
            await apiPost('/whatsapp/enviar-articulo', { telefono: tel, articulo: a, cliente, mensaje }, token);
          } else {
            if (a.ite_imag) {
              await apiPost('/whatsapp/enviar-mixto', { telefono: tel, imagenUrl: `${IMG_BASE}${encodeURIComponent(a.ite_imag)}`, mensaje: generarMensajeArticulo(a) }, token);
            } else {
              await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje: generarMensajeArticulo(a) }, token);
            }
          }
        }
      } else if (archivosSel.length > 0) {
        await apiPost('/whatsapp/enviar-mixto', { telefono: tel, mensaje, archivos: archivosSel.map(a => a.ruta) }, token);
      } else {
        await apiPost('/whatsapp/enviar-texto', { telefono: tel, mensaje: mensaje.trim() }, token);
      }
      setResultado({ ok: true, texto: `✓ Mensaje enviado a ${cliente.ter_deno}` });
      setArticulosSel([]);
      setArchivosSel([]);
    } catch (err) {
      setResultado({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const incidenciasMostrar = verTodasIncidencias ? incidencias : incidencias.slice(0, 15);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tema.fondo }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
      }
    >
      <View style={[styles.cabecera, { backgroundColor: tema.gridHeader }]}>
        <Text style={[styles.clienteNombre, { color: tema.texto }]}>{cliente.ter_deno}</Text>
        <Text style={[styles.clienteDatos, { color: tema.textoSuave }]}>{cliente.ter_rucn || 'Sin RUC'}</Text>
        <Text style={[styles.clienteDatos, { color: tema.textoSuave }]}>{cliente.ter_dire || ''}</Text>
      </View>

      <View style={[styles.resumen, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
        <Text style={[styles.resumenTitulo, { color: tema.primario }]}>Situación actual</Text>
        <Text style={[styles.resumenLinea, { color: tema.texto }]}>Documentos pendientes: <Text style={[styles.resumenValor, { color: tema.primario }]}>{resumen.total_documentos}</Text></Text>
        <Text style={[styles.resumenLinea, { color: tema.texto }]}>Vencidos: <Text style={[styles.resumenValor, { color: '#c0392b' }]}>{resumen.total_vencidos}</Text></Text>
        {resumen.saldo_PEN ? (
          <Text style={[styles.resumenLinea, { color: tema.texto }]}>Saldo S/. <Text style={[styles.resumenValor, { color: tema.primario }]}>{formatMoneda(resumen.saldo_PEN)}</Text></Text>
        ) : null}
        {resumen.saldo_USD ? (
          <Text style={[styles.resumenLinea, { color: tema.texto }]}>Saldo US$ <Text style={[styles.resumenValor, { color: tema.primario }]}>{formatMoneda(resumen.saldo_USD)}</Text></Text>
        ) : null}
        <Text style={[styles.resumenLinea, { color: tema.texto }]}>
          Vendedor: <Text style={[styles.resumenValor, { color: tema.primario }]}>{cliente.vendedor_nombre || cliente.ter_core || '-'}</Text>
        </Text>
      </View>

      <View style={[styles.resumen, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
        <Text style={[styles.resumenTitulo, { color: tema.primario }]}>Última incidencia registrada</Text>
        {ultima_incidencia ? (
          <>
            <Text style={[styles.resumenLinea, { color: tema.texto }]}>Fecha: <Text style={[styles.resumenValor, { color: tema.primario }]}>{ultima_incidencia.fe_regi}</Text></Text>
            <Text style={[styles.resumenLinea, { color: tema.texto }]} numberOfLines={3}>
              Detalle: <Text style={[styles.resumenValor, { color: tema.primario }]}>{ultima_incidencia.inc_desc || '-'}</Text>
            </Text>
            <Text style={[styles.resumenLinea, { color: tema.texto }]}>Estado: <Text style={[styles.resumenValor, { color: tema.primario }]}>{estadoTexto(ultima_incidencia.inc_estc)}</Text></Text>
          </>
        ) : (
          <Text style={[styles.resumenLinea, { color: tema.texto }]}>Sin incidencias registradas</Text>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btnAccion, { backgroundColor: tema.celeste }]}
          onPress={() => navigation.navigate('NuevaIncidencia', { ter_cote, ter_deno })}
        >
          <Text style={styles.btnAccionText}>+ Registrar incidencia</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnAccion, { backgroundColor: '#f5b041' }]}
          onPress={cargarIncidencias}
          disabled={cargandoIncidencias}
        >
          {cargandoIncidencias ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnAccionText}>Ver incidencias</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btnWhatsApp, { backgroundColor: '#25D366' }]}
        onPress={abrirWhatsApp}
      >
        <Text style={styles.btnWhatsAppText}>📱 WhatsApp</Text>
      </TouchableOpacity>

      {/* Lista de incidencias */}
      {incidencias.length > 0 && (
        <View style={[styles.resumen, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          <Text style={[styles.resumenTitulo, { color: tema.primario }]}>Incidencias ({incidencias.length})</Text>
          {incidenciasMostrar.map((inc) => (
            <View key={inc.inc_codi} style={[styles.incCard, { borderBottomColor: tema.borde }]}>
              <View style={styles.incHeader}>
                <Text style={[styles.incNro, { color: tema.primario }]}>{inc.inc_codi}</Text>
                <Text style={[styles.incEstado, { backgroundColor: inc.inc_estc === 3 ? '#27ae60' : inc.inc_estc === 2 ? '#f39c12' : '#7f8c8d' }]}>
                  {estadoTexto(inc.inc_estc)}
                </Text>
              </View>
              <Text style={[styles.incFecha, { color: tema.textoSuave }]}>{inc.fe_regi}</Text>
              <Text style={[styles.incDesc, { color: tema.texto }]} numberOfLines={2}>{inc.inc_desc || '-'}</Text>
            </View>
          ))}
          {incidencias.length > 15 && (
            <TouchableOpacity onPress={() => setVerTodasIncidencias(!verTodasIncidencias)}>
              <Text style={{ color: tema.primario, fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'center' }}>
                {verTodasIncidencias ? 'Ver menos' : `Ver todas (${incidencias.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sección WhatsApp */}
      {showWhatsApp && (
        <View style={[styles.waSection, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          <View style={styles.waHeader}>
            <Text style={[styles.waTitle, { color: tema.texto }]}>Enviar WhatsApp</Text>
            <TouchableOpacity onPress={() => { setShowWhatsApp(false); setResultado(null); }}>
              <Text style={{ color: '#c0392b', fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {telOrigen ? (
            <Text style={[styles.waOrigen, { color: tema.textoSuave }]}>Enviando desde: <Text style={{ fontWeight: '700', color: tema.texto }}>{telOrigen}</Text></Text>
          ) : null}

          <Text style={[styles.waLabel, { color: tema.textoSuave }]}>Mensaje</Text>
          <TextInput
            style={[styles.waInput, styles.waTextArea, { backgroundColor: tema.fondo, borderColor: tema.borde, color: tema.texto }]}
            value={mensaje}
            onChangeText={setMensaje}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor={tema.textoSuave}
            multiline
            numberOfLines={4}
          />

          <Text style={[styles.waLabel, { color: tema.textoSuave }]}>Artículos{articulosSel.length > 0 ? ` (${articulosSel.length})` : ''}</Text>
          <FiltroPopup titulo="Seleccionar Artículos" items={articulos} seleccionados={articulosSel}
            onToggle={toggleArticulo}
            campoId="ite_item" campoNombre="ite_dsit" campoTelefono={null} color="#27ae60" />

          {articulosSel.length > 0 && (
            <View style={styles.waChips}>
              {articulosSel.map(a => (
                <View key={a.ite_item} style={[styles.waChip, { borderColor: '#27ae6040' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{a.ite_dsit || a.ite_item}</Text>
                  <TouchableOpacity onPress={() => toggleArticulo(a)}>
                    <Text style={{ color: '#c0392b', fontSize: 13, fontWeight: '700', paddingHorizontal: 3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.btnArchivo, { borderColor: tema.borde }]} onPress={subirArchivo}>
            <Text style={{ color: tema.texto, fontSize: 13 }}>📎 Seleccionar Archivo</Text>
          </TouchableOpacity>

          {archivosSel.length > 0 && (
            <View style={styles.waChips}>
              {archivosSel.map((a, i) => (
                <View key={i} style={[styles.waChip, { borderColor: '#88888840' }]}>
                  <Text style={{ color: '#222', fontSize: 11 }}>{a.nombre}</Text>
                  <TouchableOpacity onPress={() => setArchivosSel(prev => prev.filter((_, j) => j !== i))}>
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

          <View style={styles.waBtnRow}>
            <TouchableOpacity
              style={[styles.btnWA, { backgroundColor: '#f5f6fa', borderColor: '#ddd' }]}
              onPress={() => { setShowWhatsApp(false); setResultado(null); setArticulosSel([]); setArchivosSel([]); }}
            >
              <Text style={{ color: '#666', fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnWA, { backgroundColor: '#25D366', opacity: enviando ? 0.5 : 1 }]}
              onPress={enviarWhatsApp}
              disabled={enviando}
            >
              {enviando ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>▶ Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitulo, { color: tema.primario }]}>Documentos pendientes</Text>
      {documentos.length === 0 ? (
        <Text style={styles.vacio}>Cliente sin documentos pendientes</Text>
      ) : (
        documentos.map((d) => (
          <View key={`${d.cob_tivo}-${d.cob_nuvo}`} style={[styles.docCard, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <View style={styles.docHeader}>
              <Text style={[styles.docNro, { color: tema.primario }]}>
                {d.cob_seri}-{d.cob_nums}
              </Text>
              <Text style={styles.docEstado}>{d.estado_descripcion}</Text>
            </View>
            <View style={styles.docRow}>
              <Text style={[styles.docLabel, { color: tema.textoSuave }]}>Emisión: {d.fecha_emision || '-'}</Text>
              <Text style={[styles.docLabel, { color: tema.textoSuave }]}>Venc.: {d.fecha_vencimiento || '-'}</Text>
            </View>
            {d.dias_vencido > 0 && (
              <Text style={styles.docVencido}>Vencido {d.dias_vencido} días</Text>
            )}
            <View style={styles.docRow}>
              <Text style={[styles.docLabel, { color: tema.textoSuave }]}>Saldo: </Text>
              <Text style={styles.docSaldo}>
                {d.moneda_signo} {formatMoneda(d.saldo)}
              </Text>
            </View>
            <Text style={[styles.docPago, { color: tema.textoSuave }]}>
              Pagado: {d.moneda_signo} {formatMoneda(d.pagado)} de {formatMoneda(d.importe_original)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cabecera: { padding: 18 },
  clienteNombre: { fontSize: 17, fontWeight: '700' },
  clienteDatos: { fontSize: 13, marginTop: 2, color: '#888' },
  resumen: {
    margin: 12, borderRadius: 10, padding: 14,
    borderWidth: 1
  },
  resumenTitulo: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  resumenLinea: { fontSize: 14, marginVertical: 2 },
  resumenValor: { fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 8 },
  btnAccion: {
    flex: 1, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center'
  },
  btnAccionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnWhatsApp: {
    marginHorizontal: 12, marginTop: 8, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center'
  },
  btnWhatsAppText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitulo: {
    fontSize: 15, fontWeight: '700',
    marginTop: 10, marginHorizontal: 12, marginBottom: 6
  },
  docCard: {
    borderRadius: 10, padding: 12,
    marginHorizontal: 12, marginBottom: 8,
    borderWidth: 1
  },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNro: { fontSize: 15, fontWeight: '700' },
  docEstado: {
    fontSize: 11, color: '#fff', backgroundColor: '#7f8c8d',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden'
  },
  docRow: { flexDirection: 'row', marginTop: 6 },
  docLabel: { fontSize: 13 },
  docVencido: { fontSize: 12, color: '#c0392b', fontWeight: '700', marginTop: 4 },
  docSaldo: { fontSize: 14, fontWeight: '800', color: '#27ae60' },
  docPago: { fontSize: 12, marginTop: 4 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 20 },
  incCard: { paddingVertical: 8, borderBottomWidth: 1 },
  incHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incNro: { fontSize: 13, fontWeight: '700' },
  incEstado: { fontSize: 10, color: '#fff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  incFecha: { fontSize: 11, marginTop: 2 },
  incDesc: { fontSize: 13, marginTop: 2 },
  waSection: { marginHorizontal: 12, marginTop: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  waHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  waTitle: { fontSize: 15, fontWeight: '700' },
  waOrigen: { fontSize: 12, marginBottom: 8 },
  waLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  waInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  waTextArea: { height: 100, textAlignVertical: 'top' },
  filtroBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  waChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  waChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5f6fa', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  btnArchivo: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  waResultado: { borderRadius: 6, padding: 8, marginTop: 8 },
  waBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnWA: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%', backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  modalSearch: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 10, backgroundColor: '#f5f6fa' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' }
});
