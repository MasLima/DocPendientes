import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert, Image, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';

export default function ArticuloDetalleScreen({ route, navigation }) {
  const { codigo } = route.params || {};
  const { token } = useAuth();
  const { tema } = useTema();
  const [art, setArt] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pestana, setPestana] = useState('imagen');

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet(`/articulos/${codigo}`, token);
      setArt(data);
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
  const uVenta = fmt(art.uventa_desc, art.uventa_abrev);
  const uCompra = fmt(art.ucompra_desc, art.ucompra_abrev);
  const uStock = fmt(art.ustock_desc, art.ustock_abrev);

  const fmtNum = (v) => Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtFecha = (f) => {
    if (!f) return '-';
    try { return new Date(f).toLocaleDateString('es-PE'); } catch { return f; }
  };

  const precios = art.precios || [];

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

      {/* WhatsApp */}
      <TouchableOpacity
        style={[styles.btnWhatsApp, { backgroundColor: '#25D366' }]}
        onPress={() => navigation.navigate('WhatsAppCliente', { articuloSel: art })}
      >
        <Text style={styles.btnWhatsAppText}>📱 Enviar por WhatsApp</Text>
      </TouchableOpacity>

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
            <Campo label="U. Medida Stock" valor={uStock} />
            <Campo label="Stock Disponible" valor={`${fmtNum(art.saldo)} ${art.ustock_abrev || ''}`} />
          </View>
          <View style={styles.camposGrid}>
            <Campo label="Fecha Últ. Compra" valor={fmtFecha(art.fecha_compra)} />
            <Campo label="Fecha Últ. Venta" valor={fmtFecha(art.ite_feuv)} />
          </View>
        </View>
      )}

      {/* Tab Datos */}
      {pestana === 'datos' && (
        <View style={styles.tabContent}>
          <View style={styles.camposGrid}>
            <Campo label="Unidad Venta" valor={uVenta} />
            <Campo label="Unidad Compra" valor={uCompra} />
          </View>
          <View style={styles.camposGrid}>
            <Campo label="Costo Soles" valor={`S/. ${fmtNum(art.ite_copr)}`} />
            <Campo label="Costo Dólares" valor={`US$ ${fmtNum(art.ite_codl)}`} />
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
            precios.map((p, i) => (
              <View key={i} style={[styles.precioCard, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                <View style={styles.precioHeader}>
                  <Text style={[styles.precioTipo, { color: tema.primario }]}>{p.descripcion || p.ven_cota}</Text>
                  <Text style={[styles.precioMonto, { color: '#27ae60' }]}>{p.ven_pigv}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnWhatsApp: {
    marginHorizontal: 12, marginBottom: 10, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center'
  },
  btnWhatsAppText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  header: { margin: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between' },
  headerCodigo: { fontSize: 12, fontFamily: 'monospace' },
  headerNombre: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  headerSaldo: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  saldoNum: { fontSize: 22, fontWeight: '800' },
  saldoUnd: { fontSize: 14 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginHorizontal: 12 },
  tab: { paddingVertical: 10, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabContent: { padding: 12 },
  imgContainer: { borderRadius: 10, borderWidth: 1, padding: 8, marginBottom: 12 },
  img: { width: '100%', height: 250, borderRadius: 8 },
  imgName: { textAlign: 'center', fontSize: 11, fontFamily: 'monospace', marginTop: 6 },
  sinImg: { borderRadius: 10, borderWidth: 1, height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  camposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  campo: { flex: 1, minWidth: '45%', borderRadius: 8, padding: 10 },
  campoLabel: { fontSize: 11, fontWeight: '600' },
  campoValor: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  descLarga: { borderRadius: 8, padding: 10, marginTop: 4 },
  precioCard: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 8 },
  precioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  precioTipo: { fontSize: 14, fontWeight: '700' },
  precioMonto: { fontSize: 16, fontWeight: '800' }
});
