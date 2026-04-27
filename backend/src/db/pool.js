const { Pool } = require('pg');

function buildPoolConfig() {
  const sharedPoolConfig = {
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 8000),
    idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS || 30000),
    max: Number(process.env.PGPOOL_MAX || 5)
  };

  if (process.env.DATABASE_URL) {
    return {
      ...sharedPoolConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    };
  }

  if (process.env.SUPABASE_DB_URL) {
    return {
      ...sharedPoolConfig,
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  return {
    ...sharedPoolConfig,
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'school_library',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres'
  };
}

const pool = new Pool(buildPoolConfig());

module.exports = {
  pool
};