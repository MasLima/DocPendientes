import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';

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

export default function ClienteDetalleScreen({ route, navigation }) {
  const { ter_cote, ter_deno } = route.params;
  const { token } = useAuth();
  const { tema } = useTema();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

      <TouchableOpacity
        style={[styles.btnIncidencia, { backgroundColor: tema.celeste }]}
        onPress={() => navigation.navigate('NuevaIncidencia', { ter_cote, ter_deno })}
      >
        <Text style={styles.btnIncidenciaText}>+ Registrar incidencia</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnWhatsApp, { backgroundColor: '#25D366' }]}
        onPress={() => navigation.navigate('WhatsAppCliente', { ter_cote, ter_deno })}
      >
        <Text style={styles.btnWhatsAppText}>📱 WhatsApp</Text>
      </TouchableOpacity>

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
  btnIncidencia: {
    marginHorizontal: 12, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center'
  },
  btnIncidenciaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  vacio: { textAlign: 'center', color: '#888', marginTop: 20 }
});
