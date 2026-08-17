import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExcelIcon, PdfIcon } from './Iconos';

// Botones de exportación a Excel y PDF genéricos.
// columnas: array de nombres de columna.
// filas: array de arrays con los valores (ya formateados como texto).
function aTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function exportarExcel(nombreArchivo, columnas, filas) {
  const tabla = [columnas.map((c) => aTexto(c)), ...filas.map((f) => f.map((v) => aTexto(v)))];
  const csv = tabla.map((fila) => fila.map((celda) => `"${celda.replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarPDF(nombreArchivo, columnas, filas) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  autoTable(doc, {
    head: [columnas.map((c) => aTexto(c))],
    body: filas.map((f) => f.map((v) => aTexto(v))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 43, 76] }
  });
  doc.save(`${nombreArchivo}.pdf`);
}

export default function Exportar({ nombreArchivo, columnas, filas }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => exportarExcel(nombreArchivo, columnas, filas)}>
        <ExcelIcon size={18} /> Excel
      </button>
      <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#c0392b' }} onClick={() => exportarPDF(nombreArchivo, columnas, filas)}>
        <PdfIcon size={18} /> PDF
      </button>
    </div>
  );
}