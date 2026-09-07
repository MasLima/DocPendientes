const router = require('express').Router();
const pool = require('../config/db');
const erp = require('../config/erp');
const path = require('path');
const wa = require('../services/whatsappService');
const fileSvc = require('../services/fileService');
const tpl = require('../templates/mensajes');

// Estado de conexión
router.get('/estado', async (req, res) => {
  try {
    res.json(wa.getEstado());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contactos de WhatsApp
router.get('/contactos', async (req, res) => {
  try {
    const busqueda = (req.query.q || '').toLowerCase();
    const contactos = await wa.getContactos(busqueda);
    res.json(contactos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Empleados (usuarios con teléfono del vendedor asignado)
router.get('/empleados', async (req, res) => {
  try {
    const [rows] = await erp.query(
      `SELECT ter_cote, ter_deno AS nombre, ter_cell, ter_fono
       FROM mplter001
       WHERE ter_tite = '300000'
       ORDER BY ter_deno`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// QR code
router.get('/qr', async (req, res) => {
  try {
    const qr = wa.getQR();
    if (!qr) return res.json({ qr: null, mensaje: 'No hay QR disponible. Estado: ' + wa.getEstado().estado });
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conectar / Reconectar
router.post('/conectar', async (req, res) => {
  try {
    await wa.desconectar();
    wa.inicializar();
    res.json({ ok: true, mensaje: 'Inicializando conexión WhatsApp...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desconectar
router.post('/desconectar', async (req, res) => {
  try {
    await wa.desconectar();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar texto simple
router.post('/enviar-texto', async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;
    if (!telefono || !mensaje) return res.status(400).json({ error: 'telefono y mensaje son requeridos' });
    const telOrigen = wa.getEstado()?.conexion?.telefono || null;
    const result = await wa.enviarMensaje(telefono, mensaje);
    await guardarLog(telefono, 'texto', mensaje, null, null, req.user?.id, telOrigen);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar artículo con imagen
router.post('/enviar-articulo', async (req, res) => {
  try {
    const { telefono, articulo, cliente, mensaje } = req.body;
    if (!telefono || !articulo) return res.status(400).json({ error: 'telefono y articulo son requeridos' });

    const telOrigen = wa.getEstado()?.conexion?.telefono || null;
    const texto = mensaje || tpl.articuloIndividual(articulo);
    const imgUrl = articulo.ite_imag
      ? `https://coloma.integrator.pe/data/db0010_01/images/${encodeURIComponent(articulo.ite_imag)}`
      : null;

    if (imgUrl) {
      const result = await wa.enviarImagen(telefono, imgUrl, texto);
      await guardarLog(telefono, 'articulo', texto, imgUrl, null, req.user?.id, telOrigen);
      res.json(result);
    } else {
      const result = await wa.enviarMensaje(telefono, texto);
      await guardarLog(telefono, 'articulo', texto, null, null, req.user?.id, telOrigen);
      res.json(result);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar archivo local
router.post('/enviar-archivo', async (req, res) => {
  try {
    const { telefono, archivo, mensaje } = req.body;
    if (!telefono || !archivo) return res.status(400).json({ error: 'telefono y archivo son requeridos' });

    const telOrigen = wa.getEstado()?.conexion?.telefono || null;
    fileSvc.validarArchivo(archivo);
    const result = await wa.enviarArchivoLocal(telefono, archivo, mensaje || '');
    await guardarLog(telefono, 'archivo', mensaje || '', null, [archivo], req.user?.id, telOrigen);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mixto (texto + imagen + archivos)
router.post('/enviar-mixto', async (req, res) => {
  try {
    const { telefono, mensaje, imagenUrl, archivos } = req.body;
    if (!telefono) return res.status(400).json({ error: 'telefono es requerido' });

    const telOrigen = wa.getEstado()?.conexion?.telefono || null;
    if (archivos) {
      for (const f of archivos) fileSvc.validarArchivo(f);
    }

    const result = await wa.enviarMixto(telefono, { mensaje, imagenUrl, archivos });
    await guardarLog(telefono, 'mixto', mensaje || '', imagenUrl || null, archivos || null, req.user?.id, telOrigen);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar archivos
router.get('/archivos', async (req, res) => {
  try {
    const ruta = req.query.ruta;
    if (!ruta) {
      return res.json({ carpetas: fileSvc.getCarpetasPermitidas() });
    }
    const archivos = fileSvc.listarArchivos(ruta);
    res.json({ ruta, archivos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subir archivo
router.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.archivo) {
      return res.status(400).json({ error: 'No se envió archivo' });
    }
    const archivo = req.files.archivo;
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'whatsapp');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const destino = path.join(uploadDir, `${Date.now()}_${archivo.name}`);
    await archivo.mv(destino);
    res.json({ ruta: destino, nombre: archivo.name, tamano: archivo.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial con filtros
router.get('/historial', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { fecha_inicio, fecha_fin, telefono_origen, telefono_destino, busqueda } = req.query;

    let where = [];
    let params = [];

    if (fecha_inicio) { where.push('wm.fecha_envio >= ?'); params.push(fecha_inicio); }
    if (fecha_fin) { where.push('wm.fecha_envio <= ?'); params.push(fecha_fin + ' 23:59:59'); }
    if (telefono_origen) { where.push('wm.telefono_origen LIKE ?'); params.push(`%${telefono_origen}%`); }
    if (telefono_destino) { where.push('wm.telefono LIKE ?'); params.push(`%${telefono_destino}%`); }
    if (busqueda) { where.push('(wm.telefono_origen LIKE ? OR wm.telefono LIKE ? OR c.ter_deno LIKE ?)'); params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT wm.*, c.ter_deno AS cliente_nombre,
              CONCAT(u.use_name, ' ', u.use_apel) AS enviado_por_nombre
       FROM whatsapp_mensajes wm
       LEFT JOIN clientes c ON c.ter_cote = wm.ter_cote
       LEFT JOIN usuarios_app u ON u.id = wm.enviado_por
       ${whereClause}
       ORDER BY wm.fecha_envio DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM whatsapp_mensajes wm ${whereClause}`, params);
    res.json({ datos: rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function guardarLog(telefono, tipo, mensaje, imagenUrl, archivos, userId, telefonoOrigen) {
  try {
    let terCote = null;
    const [cli] = await pool.query('SELECT ter_cote FROM clientes WHERE ter_cell = ? OR ter_fono = ? LIMIT 1', [telefono, telefono]);
    if (cli.length > 0) terCote = cli[0].ter_cote;

    await pool.query(
      `INSERT INTO whatsapp_mensajes (ter_cote, telefono, tipo, mensaje, imagen_url, archivos, estado, enviado_por, telefono_origen)
       VALUES (?, ?, ?, ?, ?, ?, 'enviado', ?, ?)`,
      [terCote, telefono, tipo, mensaje, imagenUrl, archivos ? JSON.stringify(archivos) : null, userId, telefonoOrigen || null]
    );
  } catch (err) {
    console.error('[WA] Error guardando log:', err.message);
  }
}

module.exports = router;
