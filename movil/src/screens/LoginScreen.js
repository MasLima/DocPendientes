import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { tema } = useTema();
  const [use_logi, setLogin] = useState('');
  const [use_pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!use_logi || !use_pass) {
      Alert.alert('Campos requeridos', 'Ingresa usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(use_logi, use_pass);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: tema.fondo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.card, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
        <Text style={[styles.title, { color: tema.texto }]}>Cobranza Móvil</Text>
        <Text style={[styles.subtitle, { color: tema.textoSuave }]}>Gestión de documentos pendientes</Text>

        <TextInput
          style={[styles.input, { backgroundColor: tema.fondo, borderColor: tema.borde, color: tema.texto }]}
          placeholder="Usuario"
          placeholderTextColor={tema.textoSuave}
          value={use_logi}
          onChangeText={setLogin}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: tema.fondo, borderColor: tema.borde, color: tema.texto }]}
          placeholder="Contraseña"
          placeholderTextColor={tema.textoSuave}
          value={use_pass}
          onChangeText={setPass}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f5f6fa'
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    // Sombra sutil en web
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }
    })
  },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1a2b4c' },
  subtitle: { fontSize: 13, textAlign: 'center', color: '#666', marginBottom: 26, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 16
  },
  button: {
    backgroundColor: '#1a2b4c',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});