import { sql } from '@vercel/postgres';

async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
    
    console.log('✅ Database connection successful!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].postgres_version);
    
    // Test if we can create a simple table
    console.log('\n🧪 Testing table creation...');
    await sql`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Test table created successfully');
    
    // Test insert
    await sql`
      INSERT INTO connection_test (test_message) 
      VALUES ('Database connection test successful!')
    `;
    console.log('✅ Test insert successful');
    
    // Test select
    const testResult = await sql`SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 1`;
    console.log('✅ Test select successful:', testResult.rows[0]);
    
    // Clean up test table
    await sql`DROP TABLE connection_test`;
    console.log('✅ Test table cleaned up');
    
    console.log('\n🎉 All database tests passed! Your Supabase connection is working perfectly.');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Check if POSTGRES_URL is set correctly in .env.local');
    console.error('2. Verify your Supabase database is running');
    console.error('3. Check if the connection string is correct');
    console.error('4. Ensure your IP is allowed in Supabase dashboard');
  }
}

// Run the test
testDatabaseConnection();
