import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import { CloseIcon, ChatbubbleIcon, WhatsAppIcon } from '../components/Iconos';
import Exportar from '../components/Exportar';
import WhatsAppModal from '../components/WhatsAppModal';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';
const PRECIOS_CONFIG = {
  '101': { label: '02 PIEZAS 10', moneda: 'S/' },
  '102': { label: '03 SELLADO', moneda: 'S/' },
  '106': { label: '04 DOLARES', moneda: 'US$' }
};

export default function ArticuloDetalleScreen() {
  const { codigo } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [articulo, setArticulo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('imagen');
  const [waModal, setWaModal] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await apiGet(`/articulos/${codigo}`, token);
      setArticulo(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, codigo]);

  useEffect(() => { cargar(); }, [cargar]);

  const formatearFecha = (f) => {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-PE');
  };

  const formatearNumero = (val, decimales = 2) => {
    const n = Number(val) || 0;
    return n.toLocaleString('es-PE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  };

  if (cargando) return <div>Cargando...</div>;
  if (error) return <div style={{ color: '#c0392b' }}>{error}</div>;
  if (!articulo) return <div>Articulo no encontrado</div>;

  const imagenUrl = articulo.ite_imag ? `${IMG_BASE}${encodeURIComponent(articulo.ite_imag)}` : null;

  const fmt = (desc, abrev) => {
    if (desc && abrev) return `${desc} (${abrev})`;
    if (desc) return desc;
    if (abrev) return abrev;
    return '-';
  };
  const uStock = fmt(articulo.ustock_desc, articulo.ustock_abrev);

  const preciosMap = {};
  if (articulo.precios) {
    articulo.precios.forEach(p => { preciosMap[p.ven_cota] = p; });
  }

  const colPdf = ['Campo', 'Valor'];
  const filasPdf = [
    ['Codigo', articulo.ite_item],
    ['Descripcion', articulo.ite_dsit || '-'],
    ['Descripcion larga', articulo.ite_dste || '-'],
    ['Unidad de stock', uStock],
    ['Linea', articulo.linea_desc || '-'],
    ['Familia', articulo.familia_desc || '-'],
    ['Estado', articulo.estado_desc || '-'],
    ['Saldo actual', `${formatearNumero(articulo.saldo)} ${articulo.ustock_abrev || ''}`],
    ['Costo soles', `S/. ${formatearNumero(articulo.ite_copr)}`],
    ['Costo dolares', `US$ ${formatearNumero(articulo.ite_codl)}`],
    ['Precio ultima venta', `S/. ${formatearNumero(articulo.ite_pruv)}`],
    ['Fecha ultima venta', formatearFecha(articulo.ite_feuv)],
    ['Fecha ultima compra', formatearFecha(articulo.fecha_compra)],
    ['Importe ultima compra', `S/. ${formatearNumero(articulo.importe_compra)}`]
  ];
  Object.entries(PRECIOS_CONFIG).forEach(([code, cfg]) => {
    const p = preciosMap[code];
    if (p) filasPdf.push([cfg.label, `${cfg.moneda} ${formatearNumero(p.ven_pigv, 3)}`]);
  });

  const tabBtn = (key, label) => (
    <button
      onClick={() => setPestana(key)}
      style={{
        padding: '8px 16px', fontSize: 13, fontWeight: pestana === key ? 700 : 400,
        border: 'none', borderBottom: pestana === key ? '2px solid var(--primario)' : '2px solid transparent',
        background: 'transparent', cursor: 'pointer', color: pestana === key ? 'var(--primario)' : 'var(--texto)'
      }}
    >
      {label}
    </button>
  );

  const btnStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Detalle del Articulo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Exportar
            nombreArchivo={`articulo_${articulo.ite_item}`}
            columnas={colPdf}
            filas={filasPdf}
            titulo={`Articulo: ${articulo.ite_item}`}
            info={[['Descripcion', articulo.ite_dsit || '-']]}
            imagenUrl={imagenUrl}
          />
          <button style={{ ...btnStyle, background: '#25D366', color: '#fff' }} onClick={() => setWaModal(true)}>
            <WhatsAppIcon size={18} /> WhatsApp
          </button>
          <button style={{ ...btnStyle, background: '#fde9ec', color: '#c0392b', border: '1px solid #f5c6cb' }} onClick={() => navigate('/articulos')}>
            <CloseIcon size={18} /> Cerrar
          </button>
        </div>
      </div>

      <WhatsAppModal abierto={waModal} onClose={() => setWaModal(false)} token={token} articulo={articulo} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--borde)', marginBottom: 16 }}>
        {tabBtn('imagen', 'Imagen')}
        {tabBtn('datos', 'Datos adicionales')}
      </div>

      {/* Tab Imagen */}
      {pestana === 'imagen' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Imagen a la izquierda */}
          <div style={{ flex: '0 0 350px' }}>
            {imagenUrl ? (
              <div>
                <img
                  src={imagenUrl}
                  alt={articulo.ite_dsit}
                  style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--borde)', background: '#fff', padding: 8 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--texto-suave)', fontFamily: 'monospace' }}>
                  {articulo.ite_imag}
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--borde)', background: 'var(--fondo)', color: 'var(--texto-suave)' }}>
                Sin imagen
              </div>
            )}
          </div>

          {/* Datos a la derecha */}
          <div style={{ flex: 1, minWidth: 280, background: 'var(--grid-header)', borderRadius: 8, padding: 14, border: '1px solid var(--borde)' }}>
            {/* Código + Nombre */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{articulo.ite_item}</span>
              <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 12 }}>{articulo.ite_dsit || '-'}</span>
            </div>

            {/* Dos columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Columna 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <FilaDetalle label="Código Alterno" valor={articulo.ite_codi || '-'} />
                <FilaDetalle label="Línea" valor={articulo.linea_desc || '-'} />
                <FilaDetalle label="Familia" valor={articulo.familia_desc || '-'} />
                <FilaDetalle label="Fecha Últ. Compra" valor={formatearFecha(articulo.fecha_compra)} />
                <FilaDetalle label="Fecha Últ. Venta" valor={formatearFecha(articulo.ite_feuv)} />
              </div>

              {/* Columna 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <FilaDetalle label="U. Medida Stock" valor={uStock} />
                <FilaDetalle label="Stock Disponible" valor={`${formatearNumero(articulo.saldo)} ${articulo.ustock_abrev || ''}`} />

                {/* Lista de Precios */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginBottom: 4 }}>Lista de Precios</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {Object.entries(PRECIOS_CONFIG).map(([code, cfg]) => {
                      const p = preciosMap[code];
                      return (
                        <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--fondo)', borderRadius: 4, border: '1px solid var(--borde)' }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{cfg.label} ({cfg.moneda})</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>
                            {cfg.moneda} {p ? formatearNumero(p.ven_pigv, 3) : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Datos adicionales */}
      {pestana === 'datos' && (
        <div>
          <h3 style={{ marginBottom: 12 }}>Informacion adicional</h3>
          <FilaDetalle label="Descripcion larga" valor={articulo.ite_dste || '-'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <FilaDetalle label="Estado" valor={articulo.estado_desc || '-'} />
            <FilaDetalle label="Linea" valor={articulo.linea_desc || '-'} />
            <FilaDetalle label="Familia" valor={articulo.familia_desc || '-'} />
            <FilaDetalle label="Unidad stock" valor={uStock} />
            <FilaDetalle label="Fecha ultima compra" valor={formatearFecha(articulo.fecha_compra)} />
            <FilaDetalle label="Importe ultima compra" valor={`S/. ${formatearNumero(articulo.importe_compra)}`} />
            <FilaDetalle label="Fecha ultima venta" valor={formatearFecha(articulo.ite_feuv)} />
            <FilaDetalle label="Costo soles" valor={`S/. ${formatearNumero(articulo.ite_copr)}`} />
            <FilaDetalle label="Costo dolares" valor={`US$ ${formatearNumero(articulo.ite_codl)}`} />
            <FilaDetalle label="Ultima sincronizacion" valor={formatearFecha(articulo.ultima_sync)} />
          </div>
        </div>
      )}
    </div>
  );
}

function CampoDetalle({ label, valor }) {
  return (
    <div style={{ padding: '8px 12px', background: 'var(--fondo)', borderRadius: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{valor || '-'}</div>
    </div>
  );
}

function FilaDetalle({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--fondo)', borderRadius: 4, border: '1px solid var(--borde)' }}>
      <span style={{ fontSize: 12, color: 'var(--texto-suave)', textAlign: 'left' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{valor || '-'}</span>
    </div>
  );
}
