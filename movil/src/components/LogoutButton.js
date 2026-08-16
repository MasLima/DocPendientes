import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

// Boton de "Salir" con icono, para la barra superior de la app.
// Se muestra siempre que haya una sesion activa (token), en Web y Movil.
export default function LogoutButton() {
  const { token, logout } = useAuth();

  if (!token) return null;

  return (
    <TouchableOpacity
      style={styles.boton}
      onPress={logout}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Salir de la aplicacion"
    >
      <Ionicons name="log-out-outline" size={22} color="#fff" />
      <Text style={styles.texto}>Salir</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6
  },
  texto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});