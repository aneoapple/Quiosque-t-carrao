import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frzhwcjgtvjevkyudknm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyemh3Y2pndHZqZXZreXVka25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTg5NDQsImV4cCI6MjA4MDg5NDk0NH0.la8Oh46-N8u45eXhcMjHW7C6-sbApShJ7hwgrzVwVxg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('products').select('count');
    if (error) {
      console.log('❌ Erro ao conectar:', error.message);
    } else {
      console.log('✅ Conexão com Supabase OK!');
      console.log('Resposta:', data);
    }
  } catch (err) {
    console.log('❌ Erro:', err.message);
  }
}

testConnection();
