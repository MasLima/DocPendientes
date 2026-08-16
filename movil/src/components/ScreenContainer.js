import React from 'react';
import { Platform, View } from 'react-native';
import { useTema } from '../context/ThemeContext';

// Contenedor de pantalla: en WEB centra el contenido con un ancho máximo
// (aspecto de aplicación de escritorio); en MÓVIL ocupa todo el ancho.
export default function ScreenContainer({ children, style, scroll }) {
  const { tema } = useTema();

  const base = {
    flex: 1,
    backgroundColor: tema.fondo
  };

  const web = Platform.OS === 'web'
    ? { maxWidth: 1100, width: '100%', alignSelf: 'center', marginHorizontal: 'auto' }
    : {};

  return <View style={[base, web, style]}>{children}</View>;
}