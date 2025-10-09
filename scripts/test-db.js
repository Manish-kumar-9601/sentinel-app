require('dotenv').config();
const postgres = require('postgres');

async function testDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  console.log('Testing database connection...\n');
  const sql = postgres(DATABASE_URL);

  try {
    // Test connection
    const result = await sql`SELECT NOW() as time, version()`;
    console.log('✅ Connection successful!');
    console.log('Time:', result[0].time);
    console.log('Version:', result[0].version.substring(0, 50) + '...\n');

    // Check tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    console.log('Tables found:', tables.length);
    if (tables.length === 0) {
      console.log('❌ No tables found! Run: node scripts/setup-db.js');
    } else {
      tables.forEach(t => console.log('  -', t.table_name));
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await sql.end();
  }
}

testDatabase();