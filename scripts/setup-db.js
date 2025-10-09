require('dotenv').config();
const postgres = require('postgres');

async function setupDatabase ()
{
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL)
    {
        console.error('❌ DATABASE_URL not found');
        process.exit(1);
    }

    console.log('🔗 Connecting to database...');
    const sql = postgres(DATABASE_URL);

    try
    {
        console.log('📋 Creating tables...\n');

        // Drop existing tables if they exist (for clean setup)
        await sql`DROP TABLE IF EXISTS emergency_contacts CASCADE`;
        await sql`DROP TABLE IF EXISTS medical_info CASCADE`;
        await sql`DROP TABLE IF EXISTS users CASCADE`;
        console.log('🧹 Cleaned up old tables');

        // Create users table
        await sql`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        hashed_password TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
        console.log('✅ Users table created');

        // Create medical_info table
        await sql`
      CREATE TABLE medical_info (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        blood_group TEXT,
        allergies TEXT,
        medications TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
        console.log('✅ Medical info table created');

        // Create emergency_contacts table
        await sql`
      CREATE TABLE emergency_contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        relationship TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
        console.log('✅ Emergency contacts table created');

        // Create index
        await sql`
      CREATE INDEX idx_emergency_contacts_user_id 
      ON emergency_contacts(user_id)
    `;
        console.log('✅ Indexes created');

        // Verify tables exist
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

        console.log('\n📊 Database tables:');
        tables.forEach(t => console.log(`   - ${t.table_name}`));

        // Test insert
        console.log('\n🧪 Testing database operations...');
        const testId = 'test_' + Date.now();

        await sql`
      INSERT INTO users (id, name, email, hashed_password)
      VALUES (${testId}, 'Test User', 'test@test.com', 'hashed123')
    `;
        console.log('✅ Insert test passed');

        await sql`DELETE FROM users WHERE id = ${testId}`;
        console.log('✅ Delete test passed');

        console.log('\n✅ Database setup complete!');
    } catch (error)
    {
        console.error('❌ Database setup failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally
    {
        await sql.end();
    }
}

setupDatabase();