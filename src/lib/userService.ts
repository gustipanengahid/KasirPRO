import { supabase } from "./supabaseClient";
import { User } from "../types";

export const userService = {
  // Ambil daftar user
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Tambah User Baru via Supabase Auth
  async createUser(
    userData: Omit<User, "id" | "created_at"> & { password?: string },
  ): Promise<User> {
    if (!userData.password) {
      throw new Error("Password wajib diisi untuk pengguna baru.");
    }

    // 1. Registrasi ke Supabase Auth
    const formattedEmail = `${userData.username.toLowerCase().trim()}@kasirpintar.local`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formattedEmail,
      password: userData.password,
      options: {
        data: {
          username: userData.username,
          name: userData.name,
          role: userData.role,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Gagal mendaftarkan autentikasi.");

    // 2. Simpan profil ke tabel public.users
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          auth_id: authData.user.id,
          username: userData.username,
          name: userData.name,
          role: userData.role,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Hapus User
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;
  },
};
