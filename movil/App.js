import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import ClienteDetalleScreen from './src/screens/ClienteDetalleScreen';
import IncidenciasScreen from './src/screens/IncidenciasScreen';
import IncidenciasClienteScreen from './src/screens/IncidenciasClienteScreen';
import ElegirClienteScreen from './src/screens/ElegirClienteScreen';
import NuevaIncidenciaScreen from './src/screens/NuevaIncidenciaScreen';
import ReportesScreen from './src/screens/ReportesScreen';
import ConfiguracionScreen from './src/screens/ConfiguracionScreen';
import HeaderButtons from './src/components/HeaderButtons';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const headerStyle = { backgroundColor: '#1a2b4c' };
const headerTintColor = '#fff';
const headerTitleStyle = { fontWeight: '700' };

// Menú lateral: opciones según los permisos del usuario.
function DrawerMenu() {
  const { user } = useAuth();
  const permisos = user?.permisos || [];

  const puede = (p) => permisos.includes(p);

  const opciones = [];
  if (puede('dashboard.ver')) opciones.push({ name: 'Dashboard', title: 'Dashboard', screen: <DashboardScreen /> });
  if (puede('clientes.ver')) opciones.push({ name: 'Clientes', title: 'Clientes', screen: <ClientesScreen /> });
  if (puede('reportes.saldos')) opciones.push({ name: 'Reportes', title: 'Reportes', screen: <ReportesScreen /> });
  if (puede('incidencias.ver')) opciones.push({ name: 'Incidencias', title: 'Incidencias', screen: <IncidenciasScreen /> });
  if (puede('sync.ejecutar') || puede('config.usuarios')) {
    opciones.push({ name: 'Configuración', title: 'Configuración', screen: <ConfiguracionScreen /> });
  }

  if (opciones.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <Text style={{ color: '#888', fontSize: 15 }}>Tu usuario no tiene opciones habilitadas</Text>
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
        drawerActiveTintColor: '#1a2b4c',
        drawerActiveBackgroundColor: '#eef3fb',
        drawerLabelStyle: { fontSize: 15, fontWeight: '600' }
      }}
    >
      {opciones.map((o) => (
        <Drawer.Screen key={o.name} name={o.name} options={{ title: o.title }}>
          {() => o.screen}
        </Drawer.Screen>
      ))}
    </Drawer.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={DrawerMenu} />
      <Stack.Screen name="ClienteDetalle" component={ClienteDetalleScreen}
        options={({ route }) => ({
          headerShown: true,
          headerStyle,
          headerTintColor,
          headerTitleStyle,
          headerRight: () => <HeaderButtons />,
          title: route.params?.ter_deno || 'Cliente'
        })} />
      <Stack.Screen name="IncidenciasCliente" component={IncidenciasClienteScreen}
        options={({ route }) => ({
          headerShown: true,
          headerStyle,
          headerTintColor,
          headerTitleStyle,
          headerRight: () => <HeaderButtons />,
          title: `Incidencias: ${route.params?.ter_deno || route.params?.ter_cote || ''}`
        })} />
      <Stack.Screen name="ElegirCliente" component={ElegirClienteScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor,
          headerTitleStyle,
          headerRight: () => <HeaderButtons />,
          title: 'Elegir cliente'
        }} />
      <Stack.Screen name="NuevaIncidencia" component={NuevaIncidenciaScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor,
          headerTitleStyle,
          headerRight: () => <HeaderButtons />,
          title: 'Nueva Incidencia'
        }} />
    </Stack.Navigator>
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
      {token ? <MainNavigator /> : <LoginScreen />}
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