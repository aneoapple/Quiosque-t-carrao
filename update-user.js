import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frzhwcjgtvjevkyudknm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyemh3Y2pndHZqZXZreXVka25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTg5NDQsImV4cCI6MjA4MDg5NDk0NH0.la8Oh46-N8u45eXhcMjHW7C6-sbApShJ7hwgrzVwVxg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateUser() {
  try {
    const { data, error } = await supabase.from('app_users')
      .update({ password: '1010@' })
      .eq('username', 'Alexandre')
      .select();
    
    if (error) {
      console.log('❌ Erro:', error.message);
    } else {
      console.log('✅ Usuário atualizado com sucesso!');
      console.log('Dados:', data);
    }
  } catch (err) {
    console.log('❌ Erro:', err.message);
  }
}

updateUser();
