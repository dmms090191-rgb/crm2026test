import { createClient } from '@supabase/supabase-js';
import { stockageSession } from './stockageSession';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /* web et PWA : sessionStorage, inchange. Mobile : stockage natif persistant.
       Voir src/lib/stockageSession.ts — c'est le SEUL endroit ou cela se decide. */
    storage: stockageSession(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
