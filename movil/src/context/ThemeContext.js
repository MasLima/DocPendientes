import React, { createContext, useState, useContext } from 'react';

const temas = {
  claro: {
    esOscuro: false,
    fondo: '#f5f6fa',
    tarjeta: '#ffffff',
    borde: '#eee',
    texto: '#222222',
    textoSuave: '#888888',
    primario: '#1a2b4c',
    primarioTexto: '#ffffff',
    tabInactivo: '#999999',
    celeste: '#85c1e9',
    gridHeader: '#d5e8d4',
    active: '#d5e8d4',
    warning: '#f5b041',
    verde: '#27ae60',
    rojo: '#c0392b',
    azul: '#2980b9'
  },
  oscuro: {
    esOscuro: true,
    fondo: '#111827',
    tarjeta: '#1f2937',
    borde: '#374151',
    texto: '#e5e7eb',
    textoSuave: '#9ca3af',
    primario: '#1a2b4c',
    primarioTexto: '#ffffff',
    tabInactivo: '#6b7280',
    celeste: '#85c1e9',
    gridHeader: '#2a3a4a',
    active: '#2a3a4a',
    warning: '#f5b041',
    verde: '#27ae60',
    rojo: '#c0392b',
    azul: '#2980b9'
  }
};

const ThemeContext = createContext({ tema: temas.claro, alternarTema: () => {} });

export function ThemeProvider({ children }) {
  const [esOscuro, setEsOscuro] = useState(false);

  const alternarTema = () => setEsOscuro((v) => !v);

  return (
    <ThemeContext.Provider value={{ tema: temas[esOscuro ? 'oscuro' : 'claro'], esOscuro, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  return useContext(ThemeContext);
}