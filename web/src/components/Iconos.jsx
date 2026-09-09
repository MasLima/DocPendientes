// Iconos SVG estilo Ionicons (los mismos que usa el móvil con @expo/vector-icons).
// Tamaño y color controlados por props; stroke=currentColor para heredar el color.
// Ionicons usa viewBox 512 con strokeWidth 32; sin ese grosor los trazos
// quedan invisibles al escalar a 18-22px.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 32,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export function LogOutIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M304 336v40a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V136a40 40 0 0 1 40-40h152c22.09 0 48 17.91 48 40v40" />
      <path d="M368 336l80-80-80-80" />
      <line x1="416" y1="256" x2="304" y2="256" />
    </svg>
  );
}

export function GridIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <rect x="48" y="48" width="176" height="176" rx="28.6" />
      <rect x="288" y="48" width="176" height="176" rx="28.6" />
      <rect x="48" y="288" width="176" height="176" rx="28.6" />
      <rect x="288" y="288" width="176" height="176" rx="28.6" />
    </svg>
  );
}

export function PeopleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M402 168c-2.93 40.67-33.1 72-66 72s-63.12-31.32-66-72c-3-42.31 26.4-72 66-72s69 30.46 66 72z" />
      <path d="M336 304c-65.17 0-127.84 32.37-143.54 95.41-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.8-8.25 11.72-16.59C463.84 336.37 401.17 304 336 304z" />
      <path d="M200 185.94c-2.34 32.48-26.72 58.06-53 58.06s-50.7-25.57-53-58.06C91.61 152.15 115.34 128 147 128s55.39 24.77 53 57.94z" />
      <path d="M206 306a236.34 236.34 0 0 0-1.39-31.47c-10.9-39.89-41.18-63.6-81.61-63.6-24.43 0-50.82 8.94-68.61 32.66C37.45 253 30.5 277.43 32.17 303.6c1.12 16.53 10.9 28.4 25.86 28.4H196a16 16 0 0 0 10-26z" />
    </svg>
  );
}

export function BarChartIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M32 32v432a16 16 0 0 0 16 16h432" />
      <rect x="96" y="224" width="80" height="192" rx="20" ry="20" />
      <rect x="240" y="176" width="80" height="240" rx="20" ry="20" />
      <rect x="383.71" y="112" width="80" height="304" rx="20" ry="20" />
    </svg>
  );
}

export function ChatbubbleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M87.48 380c1.2-3.95-3.88-8.45-3.88-8.45l-35.13-12.35a24 24 0 0 1-19.07-23V112a24 24 0 0 1 24-24h384a24 24 0 0 1 24 24v224a24 24 0 0 1-24 24h-254.12l-42.7 34.39a24 24 0 0 1-31-1.63z" />
      <circle cx="128" cy="224" r="8" fill="currentColor" stroke="none" />
      <circle cx="256" cy="224" r="8" fill="currentColor" stroke="none" />
      <circle cx="384" cy="224" r="8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SettingsIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M262.29 192.31a64 64 0 1 0 57.4 57.4 64 64 0 0 0-57.4-57.4zM416.22 256a160.32 160.32 0 0 0-2.56-25.44l32.61-24.4a12.51 12.51 0 0 0 2.83-17.4l-34.32-59.46a12.5 12.5 0 0 0-16.9-4.92l-38.5 16.85a160.49 160.49 0 0 0-21.95-12.68l-6.02-41.72A12.51 12.51 0 0 0 317.33 96h-68.66a12.51 12.51 0 0 0-12.44 10.84l-6.02 41.72a160.49 160.49 0 0 0-21.95 12.68l-38.5-16.85a12.5 12.5 0 0 0-16.9 4.92l-34.32 59.46a12.51 12.51 0 0 0 2.83 17.4l32.61 24.4a160.32 160.32 0 0 0-2.56 25.44 160.32 160.32 0 0 0 2.56 25.44l-32.61 24.4a12.51 12.51 0 0 0-2.83 17.4l34.32 59.46a12.5 12.5 0 0 0 16.9 4.92l38.5-16.85a160.49 160.49 0 0 0 21.95 12.68l6.02 41.72A12.51 12.51 0 0 0 248.67 416h68.66a12.51 12.51 0 0 0 12.44-10.84l6.02-41.72a160.49 160.49 0 0 0 21.95-12.68l38.5 16.85a12.5 12.5 0 0 0 16.9-4.92l34.32-59.46a12.51 12.51 0 0 0-2.83-17.4l-32.61-24.4a160.32 160.32 0 0 0 2.56-25.44z" />
      <circle cx="256" cy="256" r="32" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BoxIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M408 112H104a56.16 56.16 0 0 0-56 56v192a56.16 56.16 0 0 0 56 56h304a56.16 56.16 0 0 0 56-56V168a56.16 56.16 0 0 0-56-56z" />
      <path d="M392 112V80a24 24 0 0 0-24-24H144a24 24 0 0 0-24 24v32" />
      <path d="M256 112v96" />
      <rect x="112" y="272" width="288" height="96" rx="8" />
    </svg>
  );
}

export function DocumentIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M216 464h-96a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h160l112 112v256a48 48 0 0 1-48 48z" />
      <path d="M216 48v96a16 16 0 0 0 16 16h96" />
      <line x1="144" y1="216" x2="320" y2="216" />
      <line x1="144" y1="272" x2="320" y2="272" />
      <line x1="144" y1="328" x2="320" y2="328" />
    </svg>
  );
}

export function CalendarIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <rect x="48" y="80" width="416" height="384" rx="48" />
      <line x1="128" y1="48" x2="128" y2="112" />
      <line x1="384" y1="48" x2="384" y2="112" />
      <line x1="128" y1="192" x2="384" y2="192" />
      <line x1="128" y1="272" x2="384" y2="272" />
      <line x1="128" y1="352" x2="384" y2="352" />
    </svg>
  );
}

export function TimeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M256 48a208 208 0 1 0 208 208A208 208 0 0 0 256 48z" />
      <path d="M256 144v112l80 56" />
    </svg>
  );
}

export function StatsIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M112 464h288" />
      <path d="M80 320h64a16 16 0 0 0 16-16V128a16 16 0 0 0-16-16H80a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16z" />
      <path d="M256 416h64a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16h-64a16 16 0 0 0-16 16v352a16 16 0 0 0 16 16z" />
      <path d="M432 416h64a16 16 0 0 0 16-16V192a16 16 0 0 0-16-16h-64a16 16 0 0 0-16 16v208a16 16 0 0 0 16 16z" />
    </svg>
  );
}

export function ExcelIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M400 32H128a48 48 0 0 0-48 48v368a48 48 0 0 0 48 48h272a48 48 0 0 0 48-48V80a48 48 0 0 0-48-48z" />
      <path d="M416 144H96" />
      <path d="M176 224l-64 64" />
      <path d="M112 224l64 64" />
      <path d="M256 224v128" />
      <path d="M320 224l-64 64" />
      <path d="M256 288l64 64" />
    </svg>
  );
}

export function PdfIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M368 415.86V72a24.07 24.07 0 0 0-24-24H72a24.07 24.07 0 0 0-24 24v352a40.12 40.12 0 0 0 40 40h328" />
      <path d="M416 464a48 48 0 0 1-48-48V128h72a24 24 0 0 1 24 24v264a48 48 0 0 1-48 48z" />
      <line x1="112" y1="192" x2="256" y2="192" />
      <line x1="112" y1="240" x2="256" y2="240" />
      <line x1="112" y1="288" x2="144" y2="288" />
      <line x1="112" y1="336" x2="144" y2="336" />
    </svg>
  );
}

export function EyeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M255.66 112c-77.94 0-157.89 45.11-220.83 132.52a32 32 0 0 0-.27 34.96c26.51 52.24 74.28 90.12 131.55 112.46a32 32 0 0 0 34.27-7.9l37.48-40.51a24 24 0 0 0 4.75-24.86 24 24 0 0 0-14.24-13.21 127 127 0 0 1-44-78.9 125.54 125.54 0 0 0-3.57-22.27c13.11 1.69 26.35 1.85 39.13-1.29a24.19 24.19 0 0 0 16.68-18.89A24 24 0 0 0 255.66 112z" />
      <circle cx="368" cy="256" r="64" />
      <path d="M448 255.56a189.55 189.55 0 0 1-6.29 35.94c-4.1 15.62-9.67 30.83-16.56 45.1a16 16 0 0 0 2.14 18.33l6.06 6.45a16 16 0 0 0 22.31.49c18.22-17.57 34.7-38.25 48.21-61.6a32.18 32.18 0 0 0 .38-34.09 262.37 262.37 0 0 0-28.74-40.8 16 16 0 0 0-22.64-1.21l-6.8 6a16 16 0 0 0-1.17 22.64z" />
    </svg>
  );
}

export function SearchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64z" />
      <line x1="338.29" y1="338.29" x2="448" y2="448" />
    </svg>
  );
}

export function PlusIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <line x1="256" y1="112" x2="256" y2="400" />
      <line x1="400" y1="256" x2="112" y2="256" />
    </svg>
  );
}

export function CheckIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M416 128 192 384l-96-96" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <line x1="368" y1="368" x2="144" y2="144" />
      <line x1="368" y1="144" x2="144" y2="368" />
    </svg>
  );
}

export function WhatsAppSendIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.818-.011 7.911z" />
    </svg>
  );
}

export function FilterIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="48.89 183.91 256.89 183.91 328.89 415.91 463.09 183.91" />
      <line x1="112" y1="96" x2="400" y2="96" />
    </svg>
  );
}

export function PaperclipIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M461.77 228.43c-26.46-26.46-65.72-32.18-103.08-17.52l-97.68 37.78c-12.64 4.9-26.02.32-33.6-11.28l-41.6-63.38c-14.84-22.62-45.72-22.62-60.56 0L90.17 228.43c-8.28 12.6-6.16 29.24 4.8 39.28l153.6 142.4c8.28 7.68 19.32 11.96 30.8 11.96h1.48c11.48 0 22.52-4.28 30.8-11.96l153.6-142.4c10.96-10.04 13.08-26.68 4.8-39.28z" />
    </svg>
  );
}

export function UploadIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M268 416h-24a16 16 0 0 1-16-16V224H124l44-44a16 16 0 1 1 22.62 22.62l-74.63 74.63A16 16 0 0 1 100 268H100v132a16 16 0 0 0 16 16h152a16 16 0 0 0 16-16V268h-16a16 16 0 0 1 0-32h16V96a16 16 0 0 1 16-16h120a16 16 0 0 1 16 16v140h-16a16 16 0 0 1 0 32h16v132a16 16 0 0 1-16 16H284" />
      <line x1="352" y1="48" x2="352" y2="176" />
      <polyline points="288 112 352 48 416 112" />
    </svg>
  );
}

export function ClearIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <circle cx="256" cy="256" r="208" />
      <line x1="352" y1="160" x2="160" y2="352" />
      <line x1="352" y1="352" x2="160" y2="160" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function FunnelIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" {...base}>
      <path d="M48.89 183.91c-12.28-12.28-12.28-32.19 0-44.47l208-208c12.28-12.28 32.19-12.28 44.47 0l208 208c12.28 12.28 12.28 32.19 0 44.47l-208 208c-12.28 12.28-32.19 12.28-44.47 0z" />
      <line x1="176" y1="176" x2="336" y2="176" />
      <line x1="208" y1="256" x2="304" y2="256" />
      <line x1="240" y1="336" x2="272" y2="336" />
    </svg>
  );
}

// Mapeo de las opciones del menú.
export function iconoDeMenu(ruta) {
  switch (ruta) {
    case '/':
      return <GridIcon />;
    case '/clientes':
      return <PeopleIcon />;
    case '/articulos':
      return <BoxIcon />;
    case '/reportes':
      return <BarChartIcon />;
    case '/incidencias':
      return <ChatbubbleIcon />;
    case '/configuracion':
      return <SettingsIcon />;
    default:
      return <GridIcon />;
  }
}