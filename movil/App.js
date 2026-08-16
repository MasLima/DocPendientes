import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTema } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import ClienteDetalleScreen from './src/screens/ClienteDetalleScreen';
import IncidenciasScreen from './src/screens/IncidenciasScreen';
import IncidenciasClienteScreen from './src/screens/IncidenciasClienteScreen';
import ElegirClienteScreen from './src/screens/ElegirClienteScreen';
import NuevaIncidenciaScreen from './src/screens/NuevaIncidenciaScreen';
import ReportesScreen from './src/screens/ReportesScreen';
import ConfiguracionScreen, { ConfigSyncScreen, ConfigUsuariosScreen } from './src/screens/ConfiguracionScreen';
import HeaderButtons from './src/components/HeaderButtons';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const headerStyle = { backgroundColor: '#1a2b4c' };
const headerTintColor = '#fff';
const headerTitleStyle = { fontWeight: '700' };

// En WEB el menú lateral es una sidebar fija (permanente); en móvil se
// despliega con el botón de hamburguesa.
const ES_WEB = Platform.OS === 'web';

function opcionesHeader(title) {
  return {
    headerShown: true,
    headerStyle,
    headerTintColor,
    headerTitleStyle,
    headerRight: () => <HeaderButtons />,
    title
  };
}

// ============================================================
// Cada sección del menú es un Stack propio. Así la navegación
// interna (detalle, incidencias, nueva incidencia, elegir cliente)
// se resuelve dentro de la misma sección sin depender del drawer.
// ============================================================

function ClientesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientesLista" component={ClientesScreen} />
      <Stack.Screen name="ClienteDetalle" component={ClienteDetalleScreen}
        options={({ route }) => opcionesHeader(route.params?.ter_deno || 'Cliente')} />
      <Stack.Screen name="IncidenciasCliente" component={IncidenciasClienteScreen}
        options={({ route }) => opcionesHeader(`Incidencias: ${route.params?.ter_deno || route.params?.ter_cote || ''}`)} />
      <Stack.Screen name="NuevaIncidencia" component={NuevaIncidenciaScreen}
        options={opcionesHeader('Nueva Incidencia')} />
    </Stack.Navigator>
  );
}

function ReportesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportesLista" component={ReportesScreen} />
      <Stack.Screen name="ClienteDetalle" component={ClienteDetalleScreen}
        options={({ route }) => opcionesHeader(route.params?.ter_deno || 'Cliente')} />
      <Stack.Screen name="IncidenciasCliente" component={IncidenciasClienteScreen}
        options={({ route }) => opcionesHeader(`Incidencias: ${route.params?.ter_deno || route.params?.ter_cote || ''}`)} />
      <Stack.Screen name="NuevaIncidencia" component={NuevaIncidenciaScreen}
        options={opcionesHeader('Nueva Incidencia')} />
    </Stack.Navigator>
  );
}

function IncidenciasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="IncidenciasLista" component={IncidenciasScreen} />
      <Stack.Screen name="IncidenciasCliente" component={IncidenciasClienteScreen}
        options={({ route }) => opcionesHeader(`Incidencias: ${route.params?.ter_deno || route.params?.ter_cote || ''}`)} />
      <Stack.Screen name="ElegirCliente" component={ElegirClienteScreen}
        options={opcionesHeader('Elegir cliente')} />
      <Stack.Screen name="NuevaIncidencia" component={NuevaIncidenciaScreen}
        options={opcionesHeader('Nueva Incidencia')} />
    </Stack.Navigator>
  );
}

function ConfigStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConfigMenu" component={ConfiguracionScreen} />
      <Stack.Screen name="ConfigSync" component={ConfigSyncScreen}
        options={opcionesHeader('Sincronización')} />
      <Stack.Screen name="ConfigUsuarios" component={ConfigUsuariosScreen}
        options={opcionesHeader('Usuarios')} />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardInicio" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

// ============================================================
// Menú lateral: opciones según los permisos del usuario.
// ============================================================
function DrawerMenu() {
  const { user } = useAuth();
  const { tema } = useTema();
  const permisos = user?.permisos || [];

  const puede = (p) => permisos.includes(p);

  const opciones = [];
  if (puede('dashboard.ver')) opciones.push({ name: 'Dashboard', title: 'Dashboard', component: DashboardStack });
  if (puede('clientes.ver')) opciones.push({ name: 'Clientes', title: 'Clientes', component: ClientesStack });
  if (puede('reportes.saldos')) opciones.push({ name: 'Reportes', title: 'Reportes', component: ReportesStack });
  if (puede('incidencias.ver')) opciones.push({ name: 'Incidencias', title: 'Incidencias', component: IncidenciasStack });
  if (puede('sync.ejecutar') || puede('config.usuarios')) {
    opciones.push({ name: 'Configuración', title: 'Configuración', component: ConfigStack });
  }

  if (opciones.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tema.fondo }}>
        <Text style={{ color: tema.textoSuave, fontSize: 15 }}>Tu usuario no tiene opciones habilitadas</Text>
      </View>
    );
  }

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle,
        headerTintColor,
        headerTitleStyle,
        headerRight: () => <HeaderButtons />,
        drawerActiveTintColor: tema.primario,
        drawerActiveBackgroundColor: '#eef3fb',
        drawerInactiveTintColor: tema.textoSuave,
        drawerLabelStyle: { fontSize: 15, fontWeight: '600' },
        drawerStyle: ES_WEB
          ? { width: 260, backgroundColor: tema.tarjeta, borderRightWidth: 1, borderRightColor: tema.borde }
          : undefined,
        drawerType: ES_WEB ? 'permanent' : 'front',
        openByDefault: ES_WEB
      }}
    >
      {opciones.map((o) => (
        <Drawer.Screen key={o.name} name={o.name} component={o.component} options={{ title: o.title }} />
      ))}
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1a2b4c" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <DrawerMenu /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}