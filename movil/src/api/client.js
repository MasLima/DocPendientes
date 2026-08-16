import API_URL from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function login(use_logi, use_pass) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ use_logi, use_pass })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion');
  return data;
}

export async function apiGet(ruta, token) {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion');
  return data;
}

export async function apiPost(ruta, body, token) {
  const res = await fetch(`${API_URL}${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion');
  return data;
}

export async function apiPut(ruta, body, token) {
  const res = await fetch(`${API_URL}${ruta}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion');
  return data;
}

export async function apiDelete(ruta, token) {
  const res = await fetch(`${API_URL}${ruta}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion');
  return data;
}

export async function getToken() {
  return AsyncStorage.getItem('cobranza_token');
}

export async function setToken(token) {
  await AsyncStorage.setItem('cobranza_token', token);
}

export async function clearToken() {
  await AsyncStorage.removeItem('cobranza_token');
}

export async function getUser() {
  const raw = await AsyncStorage.getItem('cobranza_user');
  return raw ? JSON.parse(raw) : null;
}

export async function setUser(user) {
  await AsyncStorage.setItem('cobranza_user', JSON.stringify(user));
}

export async function clearUser() {
  await AsyncStorage.removeItem('cobranza_user');
}
