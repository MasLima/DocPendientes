import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExcelIcon, PdfIcon } from './Iconos';

// Botones de exportación a Excel (.xlsx) y PDF.
// columnas: array de nombres de columna.
// filas: array de arrays con los valores.
// titulo: string opcional que se muestra como encabezado del PDF/Excel.
// info: array de [etiqueta, valor] con datos del cliente para el encabezado.
function aTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function exportarExcel(nombreArchivo, columnas, filas, titulo, info) {
  const filasConInfo = info
    ? info.map(([etiqueta, valor]) => [etiqueta, aTexto(valor)])
    : [];
  const hoja = XLSX.utils.aoa_to_sheet([
    ...(titulo ? [[titulo]] : []),
    ...filasConInfo,
    ...(titulo || info ? [[]] : []),
    columnas.map((c) => aTexto(c)),
    ...filas.map((f) => f.map((v) => aTexto(v)))
  ]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Datos');
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

function exportarPDF(nombreArchivo, columnas, filas, titulo, info) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  let y = 40;
  if (titulo) {
    doc.setFontSize(14);
    doc.setTextColor(26, 43, 76);
    doc.text(aTexto(titulo), 40, y);
    y += 18;
  }
  if (info && info.length > 0) {
    doc.setFontSize(9);
    info.forEach(([etiqueta, valor]) => {
      doc.setTextColor(90, 90, 90);
      doc.text(`${aTexto(etiqueta)}:`, 40, y);
      doc.setTextColor(0, 0, 0);
      doc.text(aTexto(valor), 120, y);
      y += 13;
    });
    y += 8;
  }
  autoTable(doc, {
    startY: y,
    head: [columnas.map((c) => aTexto(c))],
    body: filas.map((f) => f.map((v) => aTexto(v))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 43, 76] }
  });
  doc.save(`${nombreArchivo}.pdf`);
}

export default function Exportar({ nombreArchivo, columnas, filas, titulo, info }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--verde)' }}
        onClick={() => exportarExcel(nombreArchivo, columnas, filas, titulo, info)}
      >
        <ExcelIcon size={18} /> Excel
      </button>
      <button
        className="btn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#c0392b' }}
        onClick={() => exportarPDF(nombreArchivo, columnas, filas, titulo, info)}
      >
        <PdfIcon size={18} /> PDF
      </button>
    </div>
  );
}