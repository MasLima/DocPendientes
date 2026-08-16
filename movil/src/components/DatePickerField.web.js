import React from 'react';

// Versión WEB de DatePickerField: usa el <input type="date"> nativo del
// navegador (abre un calendario). Metro elige este archivo (DatePickerField.web.js)
// solo en la plataforma web.

export default function DatePickerField({ value, onChange, placeholder = 'AAAA-MM-DD', style }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 13,
        minWidth: 150,
        color: '#333',
        ...style
      }}
    />
  );
}