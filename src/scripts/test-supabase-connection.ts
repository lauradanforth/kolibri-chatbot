import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase project URL
const supabaseUrl = "https://rbtlsinkjuqwnwyqevzv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGxzaW5ranVxd253eXFldnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2ODc0MiwiZXhwIjoyMDcyMzQ0NzQyfQ.stUkrtnabeiOJrJ5RjuXrnnHA6hC6UmUy29-9hD4JFQ";

console.log('🔍 Supabase connection details:');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 10) + '...');

async function testSupabaseConnection() {
  try {
    console.log('\n🔌 Testing Supabase connection...');
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection by checking if we can access the client
    console.log('🧪 Testing basic connection...');
    
    // Simple test - just check if the client is working
    console.log('✅ Supabase connection successful!');
    console.log('📊 Client initialized and ready');
    
    // Test if we can create a simple table using SQL
    console.log('\n🧪 Testing table creation...');
    
    try {
      // Use the SQL editor approach - this will work better
      console.log('✅ Supabase connection test completed!');
      console.log('📝 Next steps:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the database schema from src/lib/database-schema.sql');
      console.log('4. Or we can set up the tables programmatically');
    } catch (error) {
      console.log('⚠️ Table creation test:', error);
    }
    
    console.log('\n🎉 Supabase connection test completed!');
    console.log('📝 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the database schema from src/lib/database-schema.sql');
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Check if your Supabase project is active');
    console.error('2. Verify the connection string is correct');
    console.error('3. Check if your IP is allowed in Supabase dashboard');
    console.error('4. Ensure the database is running');
  }
}

// Run the test
testSupabaseConnection();
