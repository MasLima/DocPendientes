import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import ClienteDetalleScreen from './src/screens/ClienteDetalleScreen';
import IncidenciasScreen from './src/screens/IncidenciasScreen';
import NuevaIncidenciaScreen from './src/screens/NuevaIncidenciaScreen';
import ReportesScreen from './src/screens/ReportesScreen';
import LogoutButton from './src/components/LogoutButton';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerStyle = { backgroundColor: '#1a2b4c' };
const headerTintColor = '#fff';
const headerTitleStyle = { fontWeight: '700' };

function ClientesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle, headerTintColor, headerTitleStyle }}>
      <Stack.Screen
        name="Clientes"
        component={ClientesScreen}
        options={{ title: 'Mis Clientes', headerRight: () => <LogoutButton /> }}
      />
      <Stack.Screen name="ClienteDetalle" component={ClienteDetalleScreen}
        options={({ route }) => ({ title: route.params?.ter_deno || 'Cliente' })} />
      <Stack.Screen name="NuevaIncidencia" component={NuevaIncidenciaScreen}
        options={{ title: 'Nueva Incidencia' }} />
    </Stack.Navigator>
  );
}

function IncidenciasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle, headerTintColor, headerTitleStyle }}>
      <Stack.Screen
        name="Incidencias"
        component={IncidenciasScreen}
        options={{ title: 'Mis Incidencias', headerRight: () => <LogoutButton /> }}
      />
      <Stack.Screen name="NuevaIncidencia" component={NuevaIncidenciaScreen}
        options={{ title: 'Nueva Incidencia' }} />
    </Stack.Navigator>
  );
}

function ReportesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle, headerTintColor, headerTitleStyle }}>
      <Stack.Screen
        name="Reportes"
        component={ReportesScreen}
        options={{ title: 'Reportes', headerRight: () => <LogoutButton /> }}
      />
      <Stack.Screen name="ClienteDetalle" component={ClienteDetalleScreen}
        options={({ route }) => ({ title: route.params?.ter_deno || 'Cliente' })} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a2b4c',
        tabBarInactiveTintColor: '#999'
      }}
    >
      <Tab.Screen name="ClientesTab" component={ClientesStack}
        options={{ title: 'Clientes', tabBarIcon: ({ color }) => <Text style={{ color }}>👥</Text> }} />
      <Tab.Screen name="ReportesTab" component={ReportesStack}
        options={{ title: 'Reportes', tabBarIcon: ({ color }) => <Text style={{ color }}>📊</Text> }} />
      <Tab.Screen name="IncidenciasTab" component={IncidenciasStack}
        options={{ title: 'Incidencias', tabBarIcon: ({ color }) => <Text style={{ color }}>⚠️</Text> }} />
    </Tab.Navigator>
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
      {token ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}