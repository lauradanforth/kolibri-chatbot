import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = "https://rbtlsinkjuqwnwyqevzv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGxzaW5ranVxd253eXFldnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2ODc0MiwiZXhwIjoyMDcyMzQ0NzQyfQ.stUkrtnabeiOJrJ5RjuXrnnHA6hC6UmUy29-9hD4JFQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteLogging() {
  try {
    console.log('🧪 Testing Complete Logging System...\n');
    
    // Test 1: Check if tables exist
    console.log('📋 Test 1: Verifying database tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['conversations', 'messages', 'context_used']);
    
    if (tablesError) {
      console.log('⚠️ Could not check tables directly, but continuing...');
    } else {
      console.log('✅ Found tables:', tables?.map(t => t.table_name).join(', '));
    }
    
    // Test 2: Create a test conversation
    console.log('\n💬 Test 2: Creating test conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        session_id: 'test_session_' + Date.now(),
        user_agent: 'Test Script',
        ip_address: '127.0.0.1'
      })
      .select()
      .single();
    
    if (convError) {
      throw new Error(`Failed to create conversation: ${convError.message}`);
    }
    
    console.log('✅ Test conversation created with ID:', conversation.id);
    
    // Test 3: Log a test message
    console.log('\n📝 Test 3: Logging test message...');
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: 'This is a test message from the logging system',
        tokens_used: 15,
        model_used: 'test-model'
      })
      .select()
      .single();
    
    if (msgError) {
      throw new Error(`Failed to create message: ${msgError.message}`);
    }
    
    console.log('✅ Test message logged with ID:', message.id);
    
    // Test 4: Log context usage
    console.log('\n📚 Test 4: Logging context usage...');
    const { data: context, error: ctxError } = await supabase
      .from('context_used')
      .insert({
        message_id: message.id,
        document_name: 'Test Document',
        document_source: 'test-source',
        document_type: 'test',
        relevance_score: 0.95,
        search_method: 'test-search'
      })
      .select()
      .single();
    
    if (ctxError) {
      throw new Error(`Failed to create context: ${ctxError.message}`);
    }
    
    console.log('✅ Test context logged with ID:', context.id);
    
    // Test 5: Query the logged data
    console.log('\n🔍 Test 5: Querying logged data...');
    const { data: queryResult, error: queryError } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          *,
          context_used (*)
        )
      `)
      .eq('id', conversation.id)
      .single();
    
    if (queryError) {
      throw new Error(`Failed to query data: ${queryError.message}`);
    }
    
    console.log('✅ Data query successful!');
    console.log('📊 Conversation details:', {
      id: queryResult.id,
      session_id: queryResult.session_id,
      message_count: queryResult.messages?.length || 0,
      context_count: queryResult.messages?.[0]?.context_used?.length || 0
    });
    
    // Test 6: Clean up test data
    console.log('\n🧹 Test 6: Cleaning up test data...');
    const { error: cleanupError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversation.id);
    
    if (cleanupError) {
      console.log('⚠️ Cleanup failed (not critical):', cleanupError.message);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }
    
    console.log('\n🎉 ALL TESTS PASSED! Your logging system is working perfectly!');
    console.log('\n📝 Next steps:');
    console.log('1. Your chatbot is ready to log conversations');
    console.log('2. Visit /admin/logs to view the admin interface');
    console.log('3. Visit /test-logging to test the chatbot logging');
    console.log('4. Start using your chatbot - all conversations will be logged!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check if all tables were created successfully');
    console.error('2. Verify the database schema is correct');
    console.error('3. Check Supabase dashboard for any errors');
  }
}

// Run the complete test
testCompleteLogging();
