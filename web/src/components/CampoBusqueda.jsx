import React from 'react';
import { SearchIcon } from './Iconos';

export default function CampoBusqueda({ value, onChange, placeholder, style, width, onFocus, onBlur }) {
  const { paddingLeft: _, padding: __, ...styleRest } = style || {};
  return (
    <div style={{ position: 'relative', width: width || '100%' }}>
      <span
        style={{
          position: 'absolute',
          left: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--texto-suave)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          zIndex: 1
        }}
      >
        <SearchIcon size={15} />
      </span>
      <input
        className="input"
        style={{ width: '100%', paddingLeft: 32, ...styleRest }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
}
