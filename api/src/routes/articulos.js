const router = require('express').Router();
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

const FOTOS_DIR = process.env.FOTOS_DIR || 'K:\\@Fotos Sistemas';

// Lista de articulos con filtros y busqueda.
router.get('/', async (req, res) => {
  try {
    const where = [];
    const params = [];

    if (req.query.q) {
      where.push('(a.ite_item LIKE ? OR a.ite_dsit LIKE ?)');
      const like = `%${req.query.q}%`;
      params.push(like, like);
    }
    if (req.query.linea) {
      where.push('a.ite_coli = ?');
      params.push(req.query.linea);
    }
    if (req.query.familia) {
      where.push('a.ite_cofa = ?');
      params.push(req.query.familia);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const ordenesValidos = {
      ite_item: 'a.ite_item',
      ite_dsit: 'a.ite_dsit',
      ustock_abrev: 'a.ustock_abrev',
      estado_desc: 'a.estado_desc',
      saldo: 'a.saldo',
      linea_desc: 'a.linea_desc',
      familia_desc: 'a.familia_desc'
    };
    const ordenCol = ordenesValidos[req.query.orden] || 'a.ite_item';
    const dir = req.query.direccion === 'DESC' ? 'DESC' : 'ASC';

    const [rows] = await pool.query(
      `SELECT a.ite_item, a.ite_dsit, a.ite_imag,
              a.saldo, a.linea_desc, a.familia_desc,
              a.estado_desc, a.ite_pruv, a.ite_feuv, a.ite_copr,
              a.ite_coli, a.ite_cofa,
              a.ustock_abrev, a.uventa_abrev, a.ucompra_abrev,
              a.ustock_desc, a.uventa_desc, a.ucompra_desc
       FROM articulos a
       ${whereSQL}
       ORDER BY ${ordenCol} ${dir}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /articulos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

// Lista de lineas para el filtro
router.get('/lineas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT ite_coli AS codigo, linea_desc AS descripcion
       FROM articulos
       WHERE ite_coli IS NOT NULL AND linea_desc IS NOT NULL
       ORDER BY linea_desc`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /articulos/lineas:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

// Lista de familias para el filtro (filtra por linea si se envia, soporta multiples)
router.get('/familias', async (req, res) => {
  try {
    const where = ['ite_cofa IS NOT NULL', 'familia_desc IS NOT NULL'];
    const params = [];
    if (req.query.linea) {
      const lineas = req.query.linea.split(',').filter(Boolean);
      if (lineas.length === 1) {
        where.push('ite_coli = ?');
        params.push(lineas[0]);
      } else if (lineas.length > 1) {
        where.push(`ite_coli IN (${lineas.map(() => '?').join(',')})`);
        params.push(...lineas);
      }
    }
    const [rows] = await pool.query(
      `SELECT DISTINCT ite_cofa AS codigo, familia_desc AS descripcion, ite_coli AS linea
       FROM articulos
       WHERE ${where.join(' AND ')}
       ORDER BY familia_desc`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /articulos/familias:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

// Imagen del articulo
router.get('/imagen/:nombre', (req, res) => {
  try {
    const nombre = req.params.nombre;
    if (!nombre || nombre.includes('..')) {
      return res.status(400).json({ error: 'Nombre invalido' });
    }
    const filePath = path.join(FOTOS_DIR, nombre);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error en GET /articulos/imagen:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

// Detalle completo de un articulo
router.get('/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*
       FROM articulos a
       WHERE a.ite_item = ?`,
      [req.params.codigo]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Articulo no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error en GET /articulos/:codigo:', err.message);
    res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
  }
});

module.exports = router;
