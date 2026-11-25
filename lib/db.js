import pg from 'pg';
const { Pool } = pg;

// Return NUMERIC columns as JS numbers (amounts are well within safe range)
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// Keep DATE columns as 'YYYY-MM-DD' strings to avoid timezone shifts
pg.types.setTypeParser(1082, (v) => v);

const globalForPool = globalThis;
export const pool =
  globalForPool.__nacesPool ||
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') globalForPool.__nacesPool = pool;

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function audit(db, actorId, action, details) {
  await db.query('INSERT INTO audit_log (actor_id, action, details) VALUES ($1, $2, $3)', [
    actorId,
    action,
    details ? JSON.stringify(details) : null,
  ]);
}
