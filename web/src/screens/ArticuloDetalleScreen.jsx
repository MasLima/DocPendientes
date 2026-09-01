import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';
import { CloseIcon } from '../components/Iconos';
import Exportar from '../components/Exportar';

const IMG_BASE = 'https://coloma.integrator.pe/data/db0010_01/images/';

export default function ArticuloDetalleScreen() {
  const { codigo } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [articulo, setArticulo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('imagen');

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
  const uVenta = fmt(articulo.uventa_desc, articulo.uventa_abrev);
  const uCompra = fmt(articulo.ucompra_desc, articulo.ucompra_abrev);
  const uStock = fmt(articulo.ustock_desc, articulo.ustock_abrev);

  const colPdf = ['Campo', 'Valor'];
  const filasPdf = [
    ['Codigo', articulo.ite_item],
    ['Descripcion', articulo.ite_dsit || '-'],
    ['Descripcion larga', articulo.ite_dste || '-'],
    ['Unidad de venta', uVenta],
    ['Unidad de compra', uCompra],
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Detalle del Articulo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Exportar
            nombreArchivo={`articulo_${articulo.ite_item}`}
            columnas={colPdf}
            filas={filasPdf}
            titulo={`Articulo: ${articulo.ite_item}`}
            info={[['Descripcion', articulo.ite_dsit || '-']]}
            imagenUrl={imagenUrl}
          />
          <button className="btn-cancelar" onClick={() => navigate('/articulos')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CloseIcon size={18} /> Cerrar
          </button>
        </div>
      </div>

      {/* Encabezado fijo */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, padding: 14, background: 'var(--tarjeta)', borderRadius: 8, border: '1px solid var(--borde)' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Codigo</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{articulo.ite_item}</div>
        </div>
        <div style={{ flex: 2, minWidth: 250 }}>
          <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Descripcion</div>
          <div style={{ fontSize: 15 }}>{articulo.ite_dsit}</div>
        </div>
        <div style={{ minWidth: 140 }}>
          <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Saldo</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: articulo.saldo > 0 ? 'var(--primario)' : '#c0392b' }}>
            {formatearNumero(articulo.saldo)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--texto-suave)' }}>{articulo.ustock_abrev || ''}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--borde)', marginBottom: 16 }}>
        {tabBtn('imagen', 'Imagen')}
        {tabBtn('datos', 'Datos adicionales')}
      </div>

      {/* Tab Imagen */}
      {pestana === 'imagen' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
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

          <div style={{ flex: 1, minWidth: 280 }}>
            {articulo.ite_dste && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Descripcion larga</div>
                <div style={{ fontSize: 14 }}>{articulo.ite_dste}</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CampoDetalle label="Unidad de stock" valor={uStock} />
              <CampoDetalle label="Estado" valor={articulo.estado_desc || '-'} />
              <CampoDetalle label="Linea" valor={articulo.linea_desc || '-'} />
              <CampoDetalle label="Familia" valor={articulo.familia_desc || '-'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <CampoDetalle label="Ultima compra" valor={`${formatearFecha(articulo.fecha_compra)}`} />
              <CampoDetalle label="Importe compra" valor={`S/. ${formatearNumero(articulo.importe_compra)}`} />
              <CampoDetalle label="Ultima venta" valor={`${formatearFecha(articulo.ite_feuv)}`} />
              <CampoDetalle label="Precio venta" valor={`S/. ${formatearNumero(articulo.ite_pruv)}`} />
            </div>
          </div>
        </div>
      )}

      {/* Tab Datos adicionales */}
      {pestana === 'datos' && (
        <div>
          <h3 style={{ marginBottom: 12 }}>Informacion adicional</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <CampoDetalle label="Estado" valor={articulo.estado_desc || '-'} />
            <CampoDetalle label="Linea" valor={articulo.linea_desc || '-'} />
            <CampoDetalle label="Familia" valor={articulo.familia_desc || '-'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <CampoDetalle label="Unidad de compra" valor={uCompra} />
            <CampoDetalle label="Fecha ultima compra" valor={formatearFecha(articulo.fecha_compra)} />
            <CampoDetalle label="Importe ultima compra" valor={`S/. ${formatearNumero(articulo.importe_compra)}`} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <CampoDetalle label="Unidad de venta" valor={uVenta} />
            <CampoDetalle label="Fecha ultima venta" valor={formatearFecha(articulo.ite_feuv)} />
            <CampoDetalle label="Precio ultima venta" valor={`S/. ${formatearNumero(articulo.ite_pruv)}`} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <CampoDetalle label="Costo soles" valor={`S/. ${formatearNumero(articulo.ite_copr)}`} />
            <CampoDetalle label="Costo dolares" valor={`US$ ${formatearNumero(articulo.ite_codl)}`} />
            <CampoDetalle label="Ultima sincronizacion" valor={formatearFecha(articulo.ultima_sync)} />
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
