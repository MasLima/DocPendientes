import React from 'react';
import { SearchIcon, CloseIcon } from './Iconos';

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
        <SearchIcon size={16} />
      </span>
      <input
        className="input"
        style={{ width: '100%', paddingLeft: 32, paddingRight: value ? 32 : undefined, ...styleRest }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--texto-suave)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            zIndex: 1
          }}
        >
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}
