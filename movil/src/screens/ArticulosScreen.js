import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  RefreshControl, Alert, ActivityIndicator, Image, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet } from '../api/client';
import ScreenContainer from '../components/ScreenContainer';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';
const POR_PAGINA = 50;

export default function ArticulosScreen({ navigation }) {
  const { token } = useAuth();
  const { tema } = useTema();
  const [data, setData] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  // Filtros
  const [lineas, setLineas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [lineaSel, setLineaSel] = useState(null);
  const [familiaSel, setFamiliaSel] = useState(null);
  const [mostrarFiltro, setMostrarFiltro] = useState(null); // 'linea' | 'familia' | null

  const cargar = useCallback(async () => {
    try {
      const [arts, lin, fam] = await Promise.all([
        apiGet('/articulos', token),
        apiGet('/articulos/lineas', token),
        apiGet('/articulos/familias', token)
      ]);
      setData(Array.isArray(arts) ? arts : []);
      setLineas(Array.isArray(lin) ? lin : []);
      setFamilias(Array.isArray(fam) ? fam : []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtrados = useMemo(() => {
    let r = data;
    const b = busqueda.trim().toLowerCase();
    if (b) {
      r = r.filter((a) =>
        (a.ite_item || '').toLowerCase().includes(b) ||
        (a.ite_dsit || '').toLowerCase().includes(b)
      );
    }
    if (lineaSel) r = r.filter((a) => a.ite_coli === lineaSel);
    if (familiaSel) r = r.filter((a) => a.ite_cofa === familiaSel);
    return r;
  }, [data, busqueda, lineaSel, familiaSel]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = useMemo(
    () => filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA),
    [filtrados, paginaSegura]
  );

  // Reset pagina al cambiar filtros
  const cambiarBusqueda = (t) => { setBusqueda(t); setPagina(1); };
  const seleccionarLinea = (codigo) => {
    setLineaSel(lineaSel === codigo ? null : codigo);
    setFamiliaSel(null);
    setPagina(1);
    setMostrarFiltro(null);
  };
  const seleccionarFamilia = (codigo) => {
    setFamiliaSel(familiaSel === codigo ? null : codigo);
    setPagina(1);
    setMostrarFiltro(null);
  };

  const familiasFiltradas = useMemo(() => {
    if (!lineaSel) return familias;
    return familias.filter((f) => f.linea === lineaSel);
  }, [familias, lineaSel]);

  const fmt = (v) => Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderFiltro = () => {
    if (!mostrarFiltro) return null;
    const items = mostrarFiltro === 'linea' ? lineas : familiasFiltradas;
    const sel = mostrarFiltro === 'linea' ? lineaSel : familiaSel;
    const label = mostrarFiltro === 'linea' ? 'Línea' : 'Familia';

    return (
      <View style={[styles.filtroPanel, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
        <Text style={[styles.filtroTitulo, { color: tema.texto }]}>{label}</Text>
        <ScrollView style={{ maxHeight: 200 }}>
          {items.map((item) => {
            const codigo = mostrarFiltro === 'linea' ? item.codigo : item.codigo;
            const desc = item.descripcion || item.codigo;
            const activo = sel === codigo;
            return (
              <TouchableOpacity
                key={codigo}
                style={[styles.filtroItem, activo && { backgroundColor: '#eef3fb' }]}
                onPress={() => mostrarFiltro === 'linea' ? seleccionarLinea(codigo) : seleccionarFamilia(codigo)}
              >
                <Text style={[styles.filtroItemText, { color: activo ? tema.primario : tema.texto }]} numberOfLines={1}>
                  {desc}
                </Text>
                {activo && <Text style={{ color: tema.primario }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          {items.length === 0 && <Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin resultados</Text>}
        </ScrollView>
        <TouchableOpacity style={[styles.filtroCerrar, { borderColor: tema.borde }]} onPress={() => setMostrarFiltro(null)}>
          <Text style={{ color: tema.primario, fontWeight: '700', fontSize: 13 }}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: tema.fondo }]}>
        {/* Buscador */}
        <TextInput
          style={[styles.buscador, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          placeholder="Buscar por código o nombre..."
          placeholderTextColor={tema.textoSuave}
          value={busqueda}
          onChangeText={cambiarBusqueda}
        />

        {/* Filtros */}
        <View style={styles.filtrosRow}>
          <TouchableOpacity
            style={[styles.filtroBtn, { backgroundColor: lineaSel ? tema.primario : tema.tarjeta, borderColor: tema.borde }]}
            onPress={() => setMostrarFiltro(mostrarFiltro === 'linea' ? null : 'linea')}
          >
            <Text style={{ color: lineaSel ? '#fff' : tema.texto, fontSize: 13, fontWeight: '600' }}>
              Línea{lineaSel ? ` ✓` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtroBtn, {
              backgroundColor: familiaSel ? tema.primario : tema.tarjeta, borderColor: tema.borde,
              opacity: lineaSel ? 1 : 0.5
            }]}
            disabled={!lineaSel}
            onPress={() => setMostrarFiltro(mostrarFiltro === 'familia' ? null : 'familia')}
          >
            <Text style={{ color: familiaSel ? '#fff' : tema.texto, fontSize: 13, fontWeight: '600' }}>
              Familia{familiaSel ? ` ✓` : ''}
            </Text>
          </TouchableOpacity>
          {(lineaSel || familiaSel) && (
            <TouchableOpacity onPress={() => { setLineaSel(null); setFamiliaSel(null); setPagina(1); }}>
              <Text style={{ color: '#e74c3c', fontSize: 13, fontWeight: '600' }}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderFiltro()}

        {/* Contador */}
        {!cargando && (
          <Text style={[styles.contador, { color: tema.textoSuave }]}>
            {filtrados.length} artículos
          </Text>
        )}

        {cargando ? (
          <Text style={[styles.vacio, { color: tema.textoSuave }]}>Cargando artículos...</Text>
        ) : (
          <FlatList
            data={visibles}
            keyExtractor={(item) => item.ite_item}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}
                onPress={() => navigation.navigate('ArticuloDetalle', { codigo: item.ite_item, nombre: item.ite_dsit })}
              >
                <View style={styles.cardRow}>
                  {item.ite_imag ? (
                    <Image
                      source={{ uri: `${IMG_BASE}${encodeURIComponent(item.ite_imag)}` }}
                      style={styles.cardImg}
                      resizeMode="contain"
                      onError={() => {}}
                    />
                  ) : (
                    <View style={[styles.cardImg, { backgroundColor: tema.fondo }]} />
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardCodigo, { color: tema.textoSuave }]}>{item.ite_item}</Text>
                    <Text style={[styles.cardNombre, { color: tema.texto }]} numberOfLines={1}>{item.ite_dsit}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={[styles.cardSaldo, { color: item.saldo > 0 ? '#27ae60' : '#e74c3c' }]}>
                        {fmt(item.saldo)}
                      </Text>
                      {item.ustock_abrev ? (
                        <Text style={[styles.cardUnd, { color: tema.textoSuave }]}>{item.ustock_abrev}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin resultados</Text>}
            ListFooterComponent={
              totalPaginas > 1 ? (
                <View style={styles.paginacion}>
                  <TouchableOpacity
                    style={[styles.pagBtn, { borderColor: tema.borde, opacity: paginaSegura <= 1 ? 0.4 : 1 }]}
                    disabled={paginaSegura <= 1}
                    onPress={() => setPagina(paginaSegura - 1)}
                  >
                    <Text style={{ color: tema.texto }}>←</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pagTexto, { color: tema.textoSuave }]}>
                    {paginaSegura}/{totalPaginas}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pagBtn, { borderColor: tema.borde, opacity: paginaSegura >= totalPaginas ? 0.4 : 1 }]}
                    disabled={paginaSegura >= totalPaginas}
                    onPress={() => setPagina(paginaSegura + 1)}
                  >
                    <Text style={{ color: tema.texto }}>→</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  buscador: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8, fontSize: 15
  },
  filtrosRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  filtroBtn: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8
  },
  filtroPanel: {
    borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 10
  },
  filtroTitulo: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  filtroItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6
  },
  filtroItemText: { fontSize: 13, flex: 1 },
  filtroCerrar: { alignItems: 'center', paddingTop: 8, marginTop: 4, borderTopWidth: 1 },
  contador: { fontSize: 12, marginBottom: 6 },
  card: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardImg: { width: 50, height: 50, borderRadius: 6 },
  cardInfo: { flex: 1 },
  cardCodigo: { fontSize: 11, fontFamily: 'monospace' },
  cardNombre: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  cardSaldo: { fontSize: 13, fontWeight: '700' },
  cardUnd: { fontSize: 12 },
  paginacion: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 12
  },
  pagBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  pagTexto: { fontSize: 13 },
  vacio: { textAlign: 'center', marginTop: 30, fontSize: 15 }
});
