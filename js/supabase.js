// js/supabase.js - Configuración y cliente de Supabase

// ⚠️ REEMPLAZA ESTOS VALORES con los de tu proyecto Supabase
// Los encuentras en: Settings > API en tu dashboard de Supabase
const SUPABASE_URL = 'https://dnxbldpvjiarscnouiam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueGJsZHB2amlhcnNjbm91aWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjI3MjQsImV4cCI6MjA5NzczODcyNH0.mIyfZkPF3wYMOFzEf3B6QAwc272n_qAwBxVLwqsIXmg';

// Importar cliente de Supabase (desde CDN en index.html)
const { createClient } = supabase;

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// AUTH HELPERS
// ============================================================

export const Auth = {
  async signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await db.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const { data: { user } } = await db.auth.getUser();

    console.log("USER:", user);

    const result = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    console.log(result);

    return result.data ? { ...user, ...result.data } : null;
},
  // Crea cuenta de paciente (solo dentistas)
  async createPatientAccount({ email, password, full_name, patientId }) {
    // Usamos la Admin API vía Edge Function para esto
    // Por ahora usamos signUp normal con metadata
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role: 'patient',
          patient_id: patientId
        }
      }
    });
    if (error) throw error;

    // Vincular user_id al paciente
    if (data.user && patientId) {
      await db
        .from('patients')
        .update({ user_id: data.user.id })
        .eq('id', patientId);
    }

    return data;
  },

  onAuthStateChange(callback) {
    return db.auth.onAuthStateChange(callback);
  }
};
