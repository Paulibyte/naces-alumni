// Applies SQL files in db/migrations in name order, once each.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const done = new Set(rows.map((r) => r.filename));
  for (const f of files) {
    if (done.has(f)) { console.log(`skip  ${f}`); continue; }
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [f]);
      await client.query('COMMIT');
      console.log(`apply ${f}`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`FAILED ${f}: ${e.message}`);
      process.exit(1);
    }
  }
  await client.end();
})();
