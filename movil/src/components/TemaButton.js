import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';

export default function TemaButton() {
  const { esOscuro, alternarTema } = useTema();
  return (
    <TouchableOpacity
      style={styles.boton}
      onPress={alternarTema}
      accessibilityLabel="Cambiar tema claro/oscuro"
    >
      <Ionicons name={esOscuro ? 'sunny-outline' : 'moon-outline'} size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: { marginRight: 10, padding: 2 }
});