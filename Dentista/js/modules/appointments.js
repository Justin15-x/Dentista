// js/modules/appointments.js - Gestión completa de citas

import { db, Auth } from '../supabase.js';

export const Appointments = {
  async getAll(filters = {}) {
    const user = await Auth.getCurrentUser();
    let query = db
      .from('appointments')
      .select(`
        *,
        patients(id, full_name, phone),
        appointment_treatments(id, description, amount)
      `)
      .eq('dentist_id', user.id)
      .order('appointment_date');

    if (filters.startDate) query = query.gte('appointment_date', filters.startDate);
    if (filters.endDate) query = query.lte('appointment_date', filters.endDate);
    if (filters.patientId) query = query.eq('patient_id', filters.patientId);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await db
      .from('appointments')
      .select(`
        *,
        patients(id, full_name, phone, email),
        appointment_treatments(id, description, amount),
        payments(id, amount, payment_method, payment_date)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(appointmentData) {
    const user = await Auth.getCurrentUser();
    const { data, error } = await db
      .from('appointments')
      .insert({ ...appointmentData, dentist_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, appointmentData) {
    const { data, error } = await db
      .from('appointments')
      .update({ ...appointmentData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await db
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Tratamientos adicionales (ajustes de costo)
  async addTreatment(appointmentId, { description, amount }) {
    const { data, error } = await db
      .from('appointment_treatments')
      .insert({ appointment_id: appointmentId, description, amount })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTreatment(treatmentId) {
    const { error } = await db
      .from('appointment_treatments')
      .delete()
      .eq('id', treatmentId);

    if (error) throw error;
  },

  // Calcular costo total de una cita (base + tratamientos)
  calculateTotalCost(appointment) {
    const base = parseFloat(appointment.base_cost) || 0;
    const extras = (appointment.appointment_treatments || [])
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return base + extras;
  },

  // Para pacientes: ver sus próximas citas
  async getPatientAppointments(patientId) {
    const { data, error } = await db
      .from('appointments')
      .select(`
        *,
        appointment_treatments(description, amount)
      `)
      .eq('patient_id', patientId)
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date')
      .limit(5);

    if (error) throw error;
    return data;
  }
};
