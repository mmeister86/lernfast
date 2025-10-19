// Quick DB connection test using pg.Pool (same as Better-Auth)
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connection successful!');

    // Test query: Get database version
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));

    // List tables in public schema
    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\nTables in database:');
    tables.rows.forEach(row => console.log('  -', row.tablename));

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    process.exit(1);
  }
}

testConnection();
