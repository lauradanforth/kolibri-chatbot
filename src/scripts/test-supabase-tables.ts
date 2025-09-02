import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = "https://rbtlsinkjuqwnwyqevzv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGxzaW5ranVxd253eXFldnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2ODc0MiwiZXhwIjoyMDcyMzQ0NzQyfQ.stUkrtnabeiOJrJ5RjuXrnnHA6hC6UmUy29-9hD4JFQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseTables() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: Check if we can connect
    console.log('✅ Supabase client created successfully');
    
    // Test 2: Check if tables exist and are accessible
    console.log('\n📋 Checking table access...');
    
    // Test conversations table
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.error('❌ Conversations table error:', convError);
    } else {
      console.log('✅ Conversations table accessible, count:', conversations?.length || 0);
    }
    
    // Test messages table
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.error('❌ Messages table error:', msgError);
    } else {
      console.log('✅ Messages table accessible, count:', messages?.length || 0);
    }
    
    // Test context_used table
    const { data: context, error: ctxError } = await supabase
      .from('context_used')
      .select('*')
      .limit(1);
    
    if (ctxError) {
      console.error('❌ Context_used table error:', ctxError);
    } else {
      console.log('✅ Context_used table accessible, count:', context?.length || 0);
    }
    
    // Test 3: Try to insert a test record
    console.log('\n🧪 Testing insert functionality...');
    
    const { data: testConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        session_id: `test_${Date.now()}`,
        user_agent: 'Test Script',
        ip_address: '127.0.0.1'
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
    } else {
      console.log('✅ Insert test successful, conversation ID:', testConv.id);
      
      // Clean up test data
      await supabase
        .from('conversations')
        .delete()
        .eq('id', testConv.id);
      console.log('🧹 Test data cleaned up');
    }
    
    console.log('\n🎉 Supabase connection test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSupabaseTables();
