require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

async function seed() {
  const use_logi = 'vendedor01';
  const use_pass = '123456';
  const hash = await bcrypt.hash(use_pass, 10);

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

  await pool.query(
    `INSERT INTO usuarios_app (ter_cote, use_logi, use_pass, use_name, use_apel)
     VALUES (?, ?, ?, ?, NULL)
     ON DUPLICATE KEY UPDATE use_pass = VALUES(use_pass),
                             ter_cote = VALUES(ter_cote),
                             use_name = VALUES(use_name)`,
    [vend.ter_cote, use_logi, hash, vend.ter_deno]
  );

  console.log(`Usuario creado: ${use_logi} / ${use_pass}  -> vendedor ${vend.ter_cote} (${vend.ter_deno})`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
