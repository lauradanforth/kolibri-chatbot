import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = "https://rbtlsinkjuqwnwyqevzv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGxzaW5ranVxd253eXFldnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2ODc0MiwiZXhwIjoyMDcyMzQ0NzQyfQ.stUkrtnabeiOJrJ5RjuXrnnHA6hC6UmUy29-9hD4JFQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingData() {
  try {
    console.log('🔍 Checking existing data in database...\n');
    
    // Check conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
    } else {
      console.log(`📊 Conversations (${conversations?.length || 0}):`);
      conversations?.forEach(conv => {
        console.log(`  - ID: ${conv.id}, Session: ${conv.session_id}, Created: ${conv.created_at}`);
      });
    }
    
    console.log();
    
    // Check messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
    } else {
      console.log(`💬 Messages (${messages?.length || 0}):`);
      messages?.forEach(msg => {
        console.log(`  - ID: ${msg.id}, Role: ${msg.role}, Conv: ${msg.conversation_id}, Created: ${msg.created_at}`);
        console.log(`    Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    console.log();
    
    // Check context usage
    const { data: context, error: ctxError } = await supabase
      .from('context_used')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ctxError) {
      console.error('❌ Error fetching context:', ctxError);
    } else {
      console.log(`📚 Context Usage (${context?.length || 0}):`);
      context?.forEach(ctx => {
        console.log(`  - ID: ${ctx.id}, Message: ${ctx.message_id}, Doc: ${ctx.document_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkExistingData();
