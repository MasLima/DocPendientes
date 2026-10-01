import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIAS_EMOJI } from './emojis';

// Panel de emojis estilo WhatsApp para insertar en los textos de incidencias.
// onInsert(emoji) agrega el emoji en el cursor del campo correspondiente.
export default function SelectorEmoji({ onInsert }) {
  const [abierto, setAbierto] = useState(false);
  const [cat, setCat] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const categoria = CATEGORIAS_EMOJI[cat];

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        className="btn btn-ghost"
        title="Insertar emoji"
        style={{ padding: '4px 8px', fontSize: 16, lineHeight: 1, height: 30, minWidth: 34 }}
        onClick={() => setAbierto(a => !a)}
      >
        {abierto ? '×' : '😊'}
      </button>
      {abierto && (
        <div className="card" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 40, marginTop: 4, width: 330, padding: 8 }}>
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--borde)', paddingBottom: 6, marginBottom: 6 }}>
            {CATEGORIAS_EMOJI.map((c, i) => (
              <button
                key={c.id}
                type="button"
                title={c.nombre}
                onClick={() => setCat(i)}
                style={{ border: 'none', background: cat === i ? 'var(--active)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 16, padding: '2px 7px' }}
              >
                {c.icono}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, maxHeight: 230, overflowY: 'auto' }}>
            {categoria.emojis.map((e, i) => (
              <button
                key={`${categoria.id}-${i}`}
                type="button"
                title="Insertar"
                onClick={() => onInsert(e)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, padding: 4, borderRadius: 4, lineHeight: 1.2 }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--fondo)'; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="mutado" style={{ fontSize: 11, marginTop: 6, textAlign: 'right' }}>{categoria.nombre}</div>
        </div>
      )}
    </div>
  );
}
