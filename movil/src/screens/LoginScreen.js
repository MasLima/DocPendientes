import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Cobranza Móvil</Text>
      <Text style={styles.subtitle}>Gestión de documentos pendientes</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={use_logi}
        onChangeText={setLogin}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f5f6fa'
  },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1a2b4c' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 32, marginTop: 6 },
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
