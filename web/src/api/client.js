import API_URL from '../config';

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

const TOKEN_KEY = 'cobranza_token';
const USER_KEY = 'cobranza_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}