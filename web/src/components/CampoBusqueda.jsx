import React from 'react';
import { SearchIcon } from './Iconos';

// Campo de búsqueda con icono de lupa dentro de la casilla.
// El icono (y el placeholder) desaparecen cuando hay texto.
export default function CampoBusqueda({ value, onChange, placeholder, style, width, onFocus, onBlur }) {
  return (
    <div style={{ position: 'relative', width: width || '100%' }}>
      {!value && (
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--texto-suave)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <SearchIcon size={16} />
        </span>
      )}
      <input
        className="input"
        style={{ width: '100%', paddingLeft: 34, ...style }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
}