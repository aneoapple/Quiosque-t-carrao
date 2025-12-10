/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

// Lê as variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log de segurança (só em dev) pra ver se está vindo algo
if (import.meta.env.DEV) {
    console.log("VITE_SUPABASE_URL ->", supabaseUrl);
    console.log(
        "VITE_SUPABASE_ANON_KEY está definida? ->",
        !!supabaseAnonKey
    );
}

// Proteção: se não tiver URL/KEY, dá erro claro em vez de quebrar tudo
if (!supabaseUrl) {
    throw new Error(
        "VITE_SUPABASE_URL não está definida. Configure no .env local e nas Environment Variables do Cloudflare Pages."
    );
}
if (!supabaseAnonKey) {
    throw new Error(
        "VITE_SUPABASE_ANON_KEY não está definida. Configure no .env local e nas Environment Variables do Cloudflare Pages."
    );
}

// Tenta usar localStorage apenas se o ambiente permitir
let storage: Storage | undefined = undefined;

if (typeof window !== "undefined") {
    try {
        const testKey = "__supabase_storage_test__";
        window.localStorage.setItem(testKey, "ok");
        window.localStorage.removeItem(testKey);
        storage = window.localStorage;
    } catch (e) {
        // Ambiente bloqueia storage (ex: sandbox do Google AI Studio / Antigravity)
        storage = undefined;
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // não tenta manter sessão no storage
        storage,               // se não tiver storage, fica em memória e não quebra
    },
});
