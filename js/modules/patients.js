// js/modules/patients.js - CRUD completo de pacientes

import { db, Auth } from '../supabase.js';

export const Patients = {
  async getAll() {
    const user = await Auth.getCurrentUser();
    const { data, error } = await db
      .from('patients')
      .select(`
        *,
        appointments(count),
        patient_financial_summary(total_cost, total_paid, balance_due)
      `)
      .eq('dentist_id', user.id)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await db
      .from('patients')
      .select(`
        *,
        appointments(
          id, title, appointment_date, status, base_cost,
          appointment_treatments(description, amount)
        ),
        payments(id, amount, payment_method, payment_date, notes)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(patientData) {
    const user = await Auth.getCurrentUser();
    const { data, error } = await db
      .from('patients')
      .insert({ ...patientData, dentist_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, patientData) {
    const { data, error } = await db
      .from('patients')
      .update({ ...patientData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getFinancialSummary(patientId) {
    const { data, error } = await db
      .from('patient_financial_summary')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error) throw error;
    return data;
  },

  // Para pacientes: ver su propio perfil
  async getOwnRecord() {
    const user = await Auth.getCurrentUser();
    const { data, error } = await db
      .from('patients')
      .select(`
        *,
        appointments(
          id, title, appointment_date, status, base_cost, description,
          appointment_treatments(description, amount)
        ),
        payments(amount, payment_method, payment_date)
      `)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  }
};
