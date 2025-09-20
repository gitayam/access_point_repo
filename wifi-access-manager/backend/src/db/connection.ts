import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

let db: Knex;

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'wifi_access_manager'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  }
};

export async function connectDatabase(): Promise<Knex> {
  if (!db) {
    db = knex(knexConfig);
    await db.raw('SELECT 1');
  }
  return db;
}

export function getDatabase(): Knex {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

export default db;