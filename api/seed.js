require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

// Crea usuarios de prueba de los tres roles:
//   admin01  / 123456   (administrador)
//   emplead01 / 123456  (empleado)
//   vendedor01 / 123456 (vendedor, con mas saldo pendiente o SEED_TER_COTE)
async function seed() {
  const hash = await bcrypt.hash('123456', 10);

  // --- VENDEDOR: el de mayor saldo, o SEED_TER_COTE ---
  const vendedorCote = process.env.SEED_TER_COTE || null;
  let vend = null;

  if (vendedorCote) {
    const [r] = await pool.query(
      'SELECT ter_cote, ter_deno FROM vendedores WHERE ter_cote = ?',
      [vendedorCote]
    );
    vend = r[0] || null;
  }

  if (!vend) {
    const [r] = await pool.query(
      `SELECT d.cob_core AS ter_cote, MAX(v.ter_deno) AS ter_deno
       FROM documentos d
       JOIN vendedores v ON v.ter_cote = d.cob_core
       GROUP BY d.cob_core
       ORDER BY SUM(d.saldo) DESC
       LIMIT 1`
    );
    vend = r[0] || null;
  }

  if (!vend) {
    console.error('No hay vendedores. Ejecuta primero el sync (npm run sync)');
    process.exit(1);
  }

  // Usuarios a crear: (login, rol, ter_cote, nombre)
  const usuarios = [
    ['admin01', 'admin', null, 'Administrador Sistema'],
    ['emplead01', 'empleado', null, 'Empleado Oficina'],
    ['vendedor01', 'vendedor', vend.ter_cote, vend.ter_deno]
  ];

  for (const [logi, rol, cote, nombre] of usuarios) {
    await pool.query(
      `INSERT INTO usuarios_app (ter_cote, use_logi, use_pass, use_name, use_apel, rol, origen)
       VALUES (?, ?, ?, ?, NULL, ?, 'MANUAL')
       ON DUPLICATE KEY UPDATE use_pass = VALUES(use_pass),
                               ter_cote = VALUES(ter_cote),
                               use_name = VALUES(use_name),
                               rol = VALUES(rol),
                               origen = 'MANUAL'`,
      [cote || '0', logi, hash, nombre, rol]
    );
  }

  console.log('Usuarios de prueba:');
  console.log('  admin01    / 123456  (administrador)');
  console.log('  emplead01  / 123456  (empleado)');
  console.log(`  vendedor01 / 123456  (vendedor ${vend.ter_cote} - ${vend.ter_deno})`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});