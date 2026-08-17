import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
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
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
      }
    >
      <View style={styles.cabecera}>
        <Text style={styles.clienteNombre}>{cliente.ter_deno}</Text>
        <Text style={styles.clienteDatos}>{cliente.ter_rucn || 'Sin RUC'}</Text>
        <Text style={styles.clienteDatos}>{cliente.ter_dire || ''}</Text>
      </View>

      <View style={styles.resumen}>
        <Text style={styles.resumenTitulo}>Situación actual</Text>
        <Text style={styles.resumenLinea}>Documentos pendientes: <Text style={styles.resumenValor}>{resumen.total_documentos}</Text></Text>
        <Text style={styles.resumenLinea}>Vencidos: <Text style={[styles.resumenValor, { color: '#c0392b' }]}>{resumen.total_vencidos}</Text></Text>
        {resumen.saldo_PEN ? (
          <Text style={styles.resumenLinea}>Saldo S/. <Text style={styles.resumenValor}>{formatMoneda(resumen.saldo_PEN)}</Text></Text>
        ) : null}
        {resumen.saldo_USD ? (
          <Text style={styles.resumenLinea}>Saldo US$ <Text style={styles.resumenValor}>{formatMoneda(resumen.saldo_USD)}</Text></Text>
        ) : null}
        <Text style={styles.resumenLinea}>
          Vendedor: <Text style={styles.resumenValor}>{cliente.vendedor_nombre || cliente.ter_core || '-'}</Text>
        </Text>
      </View>

      <View style={styles.resumen}>
        <Text style={styles.resumenTitulo}>Última incidencia registrada</Text>
        {ultima_incidencia ? (
          <>
            <Text style={styles.resumenLinea}>Fecha: <Text style={styles.resumenValor}>{ultima_incidencia.fe_regi}</Text></Text>
            <Text style={styles.resumenLinea} numberOfLines={3}>
              Detalle: <Text style={styles.resumenValor}>{ultima_incidencia.inc_desc || '-'}</Text>
            </Text>
            <Text style={styles.resumenLinea}>Estado: <Text style={styles.resumenValor}>{estadoTexto(ultima_incidencia.inc_estc)}</Text></Text>
          </>
        ) : (
          <Text style={styles.resumenLinea}>Sin incidencias registradas</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.btnIncidencia}
        onPress={() => navigation.navigate('NuevaIncidencia', { ter_cote, ter_deno })}
      >
        <Text style={styles.btnIncidenciaText}>+ Registrar incidencia</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitulo}>Documentos pendientes</Text>
      {documentos.length === 0 ? (
        <Text style={styles.vacio}>Cliente sin documentos pendientes</Text>
      ) : (
        documentos.map((d) => (
          <View key={`${d.cob_tivo}-${d.cob_nuvo}`} style={styles.docCard}>
            <View style={styles.docHeader}>
              <Text style={styles.docNro}>
                {d.cob_seri}-{d.cob_nums}
              </Text>
              <Text style={styles.docEstado}>{d.estado_descripcion}</Text>
            </View>
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>Emisión: {d.fecha_emision || '-'}</Text>
              <Text style={styles.docLabel}>Venc.: {d.fecha_vencimiento || '-'}</Text>
            </View>
            {d.dias_vencido > 0 && (
              <Text style={styles.docVencido}>Vencido {d.dias_vencido} días</Text>
            )}
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>Saldo: </Text>
              <Text style={styles.docSaldo}>
                {d.moneda_signo} {formatMoneda(d.saldo)}
              </Text>
            </View>
            <Text style={styles.docPago}>
              Pagado: {d.moneda_signo} {formatMoneda(d.pagado)} de {formatMoneda(d.importe_original)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  cabecera: { backgroundColor: '#1a2b4c', padding: 18 },
  clienteNombre: { color: '#fff', fontSize: 20, fontWeight: '700' },
  clienteDatos: { color: '#c8d1e0', fontSize: 13, marginTop: 2 },
  resumen: {
    backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#eee'
  },
  resumenTitulo: { fontSize: 14, fontWeight: '700', color: '#1a2b4c', marginBottom: 6 },
  resumenLinea: { fontSize: 14, color: '#444', marginVertical: 2 },
  resumenValor: { fontWeight: '700', color: '#1a2b4c' },
  btnIncidencia: {
    backgroundColor: '#27ae60', marginHorizontal: 12, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center'
  },
  btnIncidenciaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitulo: {
    fontSize: 15, fontWeight: '700', color: '#1a2b4c',
    marginTop: 10, marginHorizontal: 12, marginBottom: 6
  },
  docCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee'
  },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNro: { fontSize: 15, fontWeight: '700', color: '#1a2b4c' },
  docEstado: {
    fontSize: 11, color: '#fff', backgroundColor: '#7f8c8d',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden'
  },
  docRow: { flexDirection: 'row', marginTop: 6 },
  docLabel: { fontSize: 13, color: '#555' },
  docVencido: { fontSize: 12, color: '#c0392b', fontWeight: '700', marginTop: 4 },
  docSaldo: { fontSize: 14, fontWeight: '800', color: '#27ae60' },
  docPago: { fontSize: 12, color: '#888', marginTop: 4 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 20 }
});
