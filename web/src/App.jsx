import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTema } from './context/ThemeContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ClientesScreen from './screens/ClientesScreen';
import ClienteDetalleScreen from './screens/ClienteDetalleScreen';
import ReportesScreen from './screens/ReportesScreen';
import IncidenciasScreen from './screens/IncidenciasScreen';
import IncidenciasClienteScreen from './screens/IncidenciasClienteScreen';
import NuevaIncidenciaScreen from './screens/NuevaIncidenciaScreen';
import ConfiguracionScreen from './screens/ConfiguracionScreen';
import ConfigSyncScreen from './screens/ConfigSyncScreen';
import ConfigUsuariosScreen from './screens/ConfigUsuariosScreen';
import ConfigPerfilesScreen from './screens/ConfigPerfilesScreen';

function ThemedApp() {
  const { tema } = useTema();
  const { token } = useAuth();

  // Aplica la clase dark al <body> según el tema.
  React.useEffect(() => {
    document.body.classList.toggle('dark', tema.esOscuro);
  }, [tema.esOscuro]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginScreen />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/clientes" element={<ClientesScreen />} />
          <Route path="/clientes/:codigo" element={<ClienteDetalleScreen />} />
          <Route path="/clientes/:codigo/incidencias" element={<IncidenciasClienteScreen />} />
          <Route path="/reportes" element={<ReportesScreen />} />
          <Route path="/incidencias" element={<IncidenciasScreen />} />
          <Route path="/incidencias/:codigo" element={<IncidenciasClienteScreen />} />
          <Route path="/incidencias/nueva" element={<NuevaIncidenciaScreen />} />
          <Route path="/configuracion" element={<ConfiguracionScreen />} />
          <Route path="/configuracion/sync" element={<ConfigSyncScreen />} />
          <Route path="/configuracion/usuarios" element={<ConfigUsuariosScreen />} />
          <Route path="/configuracion/perfiles" element={<ConfigPerfilesScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}