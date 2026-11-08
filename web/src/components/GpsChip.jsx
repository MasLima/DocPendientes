// Badge GPS de una incidencia (visita).
// Con coordenadas: chip verde "📍 ±12m" con link a Google Maps.
// Sin coordenadas: chip gris "Sin ubicación".
export default function GpsChip({ lat, lng, acc, fec }) {
  if (lat == null || lng == null) {
    return <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>—</span>;
  }
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      title={fec ? `Capturada: ${fec}` : 'Ver en Google Maps'}
      className="badge"
      style={{ backgroundColor: '#27ae60', textDecoration: 'none' }}
    >
      📍 ±{acc || '?'}m
    </a>
  );
}
