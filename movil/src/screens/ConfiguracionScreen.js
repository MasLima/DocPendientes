import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Switch, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import ScreenContainer from '../components/ScreenContainer';

export default function ConfiguracionScreen({ navigation }) {
  const { user } = useAuth();
  const { tema } = useTema();

  const puede = (p) => (user.permisos || []).includes(p);
  const puedeSync = puede('sync.ejecutar') || puede('sync.ver_log');
  const puedeUsuarios = puede('config.usuarios');

  if (!puedeSync && !puedeUsuarios) {
    return <View style={[styles.center, { backgroundColor: tema.fondo }]}><Text style={[styles.vacio, { color: tema.textoSuave }]}>No tienes acceso a configuración</Text></View>;
  }

  const opciones = [];
  if (puedeSync) {
    opciones.push({
      clave: 'sync',
      titulo: 'Sincronización',
      desc: 'Ejecutar sincronización con el ERP y ver el historial',
      icono: '🔄',
      pantalla: 'ConfigSync'
    });
  }
  if (puedeUsuarios) {
    opciones.push({
      clave: 'usuarios',
      titulo: 'Usuarios',
      desc: 'Crear, editar y desactivar usuarios de la app',
      icono: '👥',
      pantalla: 'ConfigUsuarios'
    });
  }

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: tema.fondo }]}>
        <Text style={[styles.subtitulo, { color: tema.texto }]}>Configuración</Text>
        <FlatList
          data={opciones}
          keyExtractor={(o) => o.clave}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.opcion, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}
              onPress={() => navigation.navigate(item.pantalla)}
            >
              <Text style={styles.opcionIcono}>{item.icono}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.opcionTitulo, { color: tema.texto }]}>{item.titulo}</Text>
                <Text style={[styles.opcionDesc, { color: tema.textoSuave }]}>{item.desc}</Text>
              </View>
              <Text style={[styles.opcionFlecha, { color: tema.textoSuave }]}>›</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </ScreenContainer>
  );
}

// ============ SINCRONIZACION ============
export function ConfigSyncScreen() {
  const { token } = useAuth();
  const { tema } = useTema();
  const [ejecutando, setEjecutando] = useState(false);
  const [log, setLog] = useState([]);

  const cargarLog = useCallback(async () => {
    try {
      const data = await apiGet('/sync/log', token);
      setLog(Array.isArray(data) ? data : data.value || []);
    } catch (e) { /* sin permiso o error */ }
  }, [token]);

  useFocusEffect(
    useCallback(() => { cargarLog(); }, [cargarLog])
  );

  const ejecutarSync = async () => {
    setEjecutando(true);
    try {
      const r = await apiPost('/sync/ejecutar', {}, token);
      Alert.alert('Sync completado',
        `Vendedores: ${r.resultados?.maestros?.vendedores}\n` +
        `Clientes: ${r.resultados?.maestros?.clientes}\n` +
        `Documentos pendientes: ${r.resultados?.documentos?.documentos}\n` +
        `Incidencias nuevas: ${r.resultados?.incidencias?.incidencias}\n` +
        `Incidencias actualizadas: ${r.resultados?.incidencias?.actualizadas}`);
      cargarLog();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <ScrollView style={[styles.panel, { backgroundColor: tema.fondo }]}>
      <Text style={[styles.parrafo, { color: tema.textoSuave }]}>
        Sincroniza los datos desde el ERP: maestros (vendedores y clientes),
        documentos pendientes e incidencias. Puedes ejecutarla en cualquier
        momento, además de la programada.
      </Text>

      <TouchableOpacity
        style={[styles.btnPrincipal, ejecutando && styles.btnDisabled]}
        onPress={ejecutarSync}
        disabled={ejecutando}
      >
        <Text style={styles.btnPrincipalText}>
          {ejecutando ? 'Sincronizando...' : 'Ejecutar sincronización ahora'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.subtitulo, { color: tema.texto }]}>Historial de sincronizaciones</Text>
      {log.length === 0 ? (
        <Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin registros</Text>
      ) : (
        log.slice(0, 15).map((l) => (
          <View key={l.id} style={[styles.logItem, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <View style={styles.logRow}>
              <Text style={[styles.logProc, { color: tema.texto }]}>{l.proceso}</Text>
              <Text style={[styles.logRes, l.resultado === 'OK' ? styles.ok : styles.error]}>
                {l.resultado}
              </Text>
            </View>
            <Text style={[styles.logDet, { color: tema.textoSuave }]}>{l.fecha} | filas: {l.filas} {l.detalle ? `| ${l.detalle}` : ''}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ============ USUARIOS ============
const ROLES = ['admin', 'empleado', 'vendedor'];

export function ConfigUsuariosScreen() {
  const { token } = useAuth();
  const { tema } = useTema();
  const [usuarios, setUsuarios] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [verForm, setVerForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const cargar = useCallback(async () => {
    try {
      const [u, v] = await Promise.all([
        apiGet('/usuarios', token),
        apiGet('/usuarios/vendedores-disponibles', token)
      ]);
      setUsuarios(Array.isArray(u) ? u : u.value || []);
      setVendedores(Array.isArray(v) ? v : v.value || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => { cargar(); }, [cargar])
  );

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ rol: 'vendedor', activo: true });
    setVerForm(true);
  };

  const abrirEditar = (u) => {
    setEditando(u);
    setForm({ use_name: u.use_name, use_apel: u.use_apel, rol: u.rol, activo: !!u.activo });
    setVerForm(true);
  };

  const guardar = async () => {
    try {
      if (editando) {
        await apiPut(`/usuarios/${editando.id}`, form, token);
        Alert.alert('OK', 'Usuario actualizado');
      } else {
        await apiPost('/usuarios', form, token);
        Alert.alert('OK', 'Usuario creado');
      }
      setVerForm(false);
      cargar();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const desactivar = (u) => {
    Alert.alert('Desactivar usuario', `¿Desactivar ${u.use_logi}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí', onPress: async () => {
          try {
            await apiDelete(`/usuarios/${u.id}`, token);
            Alert.alert('OK', 'Usuario desactivado');
            cargar();
          } catch (err) { Alert.alert('Error', err.message); }
        }
      }
    ]);
  };

  if (verForm) {
    return (
      <ScrollView style={[styles.panel, { backgroundColor: tema.fondo }]}>
        <Text style={[styles.subtitulo, { color: tema.texto }]}>{editando ? `Editar ${editando.use_logi}` : 'Nuevo usuario'}</Text>

        {!editando && (
          <>
            <Text style={[styles.label, { color: tema.textoSuave }]}>Vendedor del ERP (obligatorio, debe existir)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
              placeholder="Código de vendedor (ej. 300029)"
              placeholderTextColor={tema.textoSuave}
              value={form.ter_cote}
              onChangeText={(t) => setForm({ ...form, ter_cote: t })}
            />
          </>
        )}

        <Text style={[styles.label, { color: tema.textoSuave }]}>Login</Text>
        <TextInput
          style={[styles.input, editando && styles.inputDisabled, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
          editable={!editando}
          placeholder="usuario"
          placeholderTextColor={tema.textoSuave}
          value={form.use_logi}
          onChangeText={(t) => setForm({ ...form, use_logi: t })}
          autoCapitalize="none"
        />

        {!editando && (
          <>
            <Text style={[styles.label, { color: tema.textoSuave }]}>Contraseña</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]}
              placeholder="clave"
              placeholderTextColor={tema.textoSuave}
              value={form.use_pass}
              onChangeText={(t) => setForm({ ...form, use_pass: t })}
              secureTextEntry
            />
          </>
        )}

        <Text style={[styles.label, { color: tema.textoSuave }]}>Nombres</Text>
        <TextInput style={[styles.input, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]} value={form.use_name}
          placeholderTextColor={tema.textoSuave}
          onChangeText={(t) => setForm({ ...form, use_name: t })} />

        <Text style={[styles.label, { color: tema.textoSuave }]}>Apellidos</Text>
        <TextInput style={[styles.input, { backgroundColor: tema.tarjeta, borderColor: tema.borde, color: tema.texto }]} value={form.use_apel}
          placeholderTextColor={tema.textoSuave}
          onChangeText={(t) => setForm({ ...form, use_apel: t })} />

        <Text style={[styles.label, { color: tema.textoSuave }]}>Perfil</Text>
        <View style={styles.chips}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, form.rol === r && styles.chipActivo]}
              onPress={() => setForm({ ...form, rol: r })}
            >
              <Text style={[styles.chipText, form.rol === r && styles.chipTextActivo]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {editando && (
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: tema.textoSuave }]}>Activo</Text>
            <Switch value={!!form.activo} onValueChange={(v) => setForm({ ...form, activo: v })} />
          </View>
        )}

        <TouchableOpacity style={styles.btnPrincipal} onPress={guardar}>
          <Text style={styles.btnPrincipalText}>{editando ? 'Guardar cambios' : 'Crear usuario'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecundario} onPress={() => setVerForm(false)}>
          <Text style={styles.btnSecundarioText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.panel, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity style={styles.btnPrincipal} onPress={abrirNuevo}>
        <Text style={styles.btnPrincipalText}>+ Nuevo usuario</Text>
      </TouchableOpacity>

      <Text style={[styles.subtitulo, { color: tema.texto }]}>Usuarios de la app</Text>
      <FlatList
        data={usuarios}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={[styles.usuarioCard, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <View style={styles.usuarioHeader}>
              <Text style={[styles.usuarioLogin, { color: tema.texto }]}>{item.use_logi}</Text>
              <View style={[styles.rolPill, item.rol === 'admin' && styles.rolAdmin]}>
                <Text style={styles.rolPillText}>{item.rol}</Text>
              </View>
              {!item.activo && <Text style={styles.inactivo}>INACTIVO</Text>}
            </View>
            <Text style={[styles.usuarioDet, { color: tema.textoSuave }]}>
              {item.use_name || ''} {item.use_apel || ''} | vendedor {item.ter_cote} {item.vendedor_nombre ? `(${item.vendedor_nombre})` : ''}
            </Text>
            <View style={styles.usuarioAcciones}>
              <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(item)}>
                <Text style={styles.btnAccionText}>Editar</Text>
              </TouchableOpacity>
              {item.activo && (
                <TouchableOpacity style={styles.btnAccionRojo} onPress={() => desactivar(item)}>
                  <Text style={styles.btnAccionText}>Desactivar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.vacio, { color: tema.textoSuave }]}>Sin usuarios</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacio: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 20 },
  subtitulo: { fontSize: 18, fontWeight: '800', color: '#1a2b4c', marginBottom: 14 },
  opcion: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee'
  },
  opcionIcono: { fontSize: 24, marginRight: 12 },
  opcionTitulo: { fontSize: 16, fontWeight: '700', color: '#1a2b4c' },
  opcionDesc: { fontSize: 13, color: '#888', marginTop: 3 },
  opcionFlecha: { fontSize: 22, color: '#999', marginLeft: 8 },
  panel: { flex: 1, padding: 16 },
  parrafo: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 14 },
  btnPrincipal: {
    backgroundColor: '#1a2b4c', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginBottom: 10
  },
  btnPrincipalText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  btnSecundario: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnSecundarioText: { color: '#888', fontSize: 14, fontWeight: '600' },
  logItem: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#eee' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between' },
  logProc: { fontSize: 13, fontWeight: '700', color: '#333' },
  logRes: { fontSize: 12, fontWeight: '800' },
  ok: { color: '#27ae60' },
  error: { color: '#c0392b' },
  logDet: { fontSize: 12, color: '#888', marginTop: 3 },
  label: { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 6
  },
  inputDisabled: { backgroundColor: '#eee', color: '#999' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee' },
  chipActivo: { backgroundColor: '#1a2b4c' },
  chipText: { color: '#555', fontWeight: '600' },
  chipTextActivo: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  usuarioCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  usuarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usuarioLogin: { fontSize: 15, fontWeight: '700', color: '#1a2b4c', flex: 1 },
  rolPill: { backgroundColor: '#eee', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rolAdmin: { backgroundColor: '#1a2b4c' },
  rolPillText: { fontSize: 11, fontWeight: '700', color: '#555' },
  inactivo: { color: '#c0392b', fontSize: 11, fontWeight: '800' },
  usuarioDet: { fontSize: 12, color: '#888', marginTop: 5 },
  usuarioAcciones: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnAccion: { backgroundColor: '#eef3fb', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  btnAccionRojo: { backgroundColor: '#fdecea', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  btnAccionText: { fontSize: 12, fontWeight: '700', color: '#1a2b4c' }
});