// Creates (or resets the password of) the first admin account from .env
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

(async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const { rows } = await client.query(
    `INSERT INTO users (full_name, email, alumni_set, password_hash, role, status, approved_at)
     VALUES ($1, $2, 'BOTH', $3, 'admin', 'approved', now())
     ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', status = 'approved'
     RETURNING id`,
    [ADMIN_NAME || 'NACES Admin', ADMIN_EMAIL.trim().toLowerCase(), hash]
  );
  console.log(`Admin ready (user id ${rows[0].id}): ${ADMIN_EMAIL}`);
  await client.end();
})();
