import supabase from "./supabase.js";

export class Appointment {
  async createAppointment(patientId, doctorId = null, doctor = null) {
    // Ensure patientId is passed as a string
    const stringPatientId = String(patientId);

    const { data, error } = await supabase
      .from("Appointment")
      .insert({ patientId: stringPatientId, doctorId, doctor })
      .select("id")
      .single();

    if (error) throw error;
    return data?.id;
  }

  async setPatientId(appointmentId, patientId) {
    const { error } = await supabase
      .from("Appointment")
      .update({ patientId: String(patientId) })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setName(appointmentId, name) {
    const { error } = await supabase
      .from("Appointment")
      .update({ name })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setSurname(appointmentId, surname) {
    const { error } = await supabase
      .from("Appointment")
      .update({ surname })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setTime(appointmentId, time) {
    const { error } = await supabase
      .from("Appointment")
      .update({ time })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setDoctor(appointmentId, doctor) {
    const { error } = await supabase
      .from("Appointment")
      .update({ doctor })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setDoctorId(appointmentId, doctorId) {
    const { error } = await supabase
      .from("Appointment")
      .update({ doctorId })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setLocation(appointmentId, location) {
    const { error } = await supabase
      .from("Appointment")
      .update({ location })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async setRadius(appointmentId, radius) {
    const radiusInt = parseInt(radius, 10);

    if (isNaN(radiusInt)) {
      throw new Error(`setRadius: "${radius}" is not a valid number`);
    }

    const { error } = await supabase
      .from("Appointment")
      .update({ radius: radiusInt })
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }

  async getAppointment(patientId) {
    const { data, error } = await supabase
      .from("Appointment")
      .select("*")
      .eq("patientId", String(patientId))
      .order("time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getAllAppointments() {
    const { data, error } = await supabase
      .from("Appointment")
      .select("*");

    if (error) throw error;
    return data;
  }

  async cancelAppointment(appointmentId) {
    const { error } = await supabase
      .from("Appointment")
      .delete()
      .eq("patientId", String(appointmentId));

    if (error) throw error;
  }
}

export class Conversation {
  async addConversation(patientId, time, actor, message) {
    const { data, error } = await supabase
      .from("Conversation")
      .insert({ patientId: String(patientId), time, actor, message })
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id;
  }

  async getConversation(patientId) {
    const { data, error } = await supabase
      .from("Conversation")
      .select("*")
      .eq("patientId", String(patientId))
      .order("time", { ascending: true });

    if (error) throw error;
    return data;
  }
}

export class Track {
  async addTrack(patientId, time, message) {
    const { data, error } = await supabase
      .from("Track")
      .insert({ patientId: String(patientId), time, message })
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data?.id;
  }

  async getTrack(patientId) {
    const { data, error } = await supabase
      .from("Track")
      .select("*")
      .eq("patientId", String(patientId))
      .order("time", { ascending: true });

    if (error) throw error;
    return data;
  }
}

export class Check {
  async Empty_field() {
    // Placeholder
  }
}