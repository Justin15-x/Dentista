// js/modules/payments.js - Sistema de pagos

import { db, Auth } from '../supabase.js';

export const Payments = {
  async getAll(filters = {}) {
    const user = await Auth.getCurrentUser();
    let query = db
      .from('payments')
      .select(`
        *,
        patients(id, full_name),
        appointments(id, title, appointment_date)
      `)
      .eq('dentist_id', user.id)
      .order('payment_date', { ascending: false });

    if (filters.patientId) query = query.eq('patient_id', filters.patientId);
    if (filters.startDate) query = query.gte('payment_date', filters.startDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(paymentData) {
    const user = await Auth.getCurrentUser();
    const { data, error } = await db
      .from('payments')
      .insert({ ...paymentData, dentist_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getPatientBalance(patientId) {
    const { data, error } = await db
      .from('patient_financial_summary')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error) throw error;
    return data;
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  }
};
