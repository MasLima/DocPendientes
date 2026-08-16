// URL del API backend.
// En la web el navegador corre en el mismo PC que la API (o en un servidor).
// Se puede sobrescribir con la variable VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default API_URL;