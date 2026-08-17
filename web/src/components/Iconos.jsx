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
      <line x1="368" y1="336" x2="448" y2="256" />
      <line x1="448" y1="256" x2="368" y2="176" />
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

// Mapeo de las opciones del menú.
export function iconoDeMenu(ruta) {
  switch (ruta) {
    case '/':
      return <GridIcon />;
    case '/clientes':
      return <PeopleIcon />;
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