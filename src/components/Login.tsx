import React, { useState } from "react";
import {
  Store,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { StoreSettings, User } from "../types";

interface LoginProps {
  storeSettings: StoreSettings;
  onLoginSuccess: (user: User) => void;
}

export default function Login({ storeSettings, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const inputEmail = email.trim().toLowerCase();

      // 1. Cek terlebih dahulu di tabel 'users' apakah email terdaftar dan statusnya aktif/non-aktif
      const { data: existingProfile } = await supabase
        .from("users")
        .select("*")
        .eq("email", inputEmail)
        .maybeSingle();

      // Jika profil ditemukan dan statusnya non-aktif, langsung tolak login
      if (existingProfile && existingProfile.active === false) {
        throw new Error(
          "Akun Anda telah dinonaktifkan. Silakan hubungi Admin.",
        );
      }

      // 2. Lakukan autentikasi langsung menggunakan Supabase Auth Email & Password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: inputEmail,
        password: password,
      });

      if (error) {
        throw new Error("Email atau password salah!");
      }

      if (data.user) {
        // Ambil data profil lengkap berdasarkan auth_id atau email
        let { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", data.user.id)
          .maybeSingle();

        if (!profile) {
          const { data: profileByEmail } = await supabase
            .from("users")
            .select("*")
            .eq("email", inputEmail)
            .maybeSingle();

          profile = profileByEmail;
        }

        // Pengecekan ganda status aktif setelah sesi auth berhasil dibuat
        if (profile && profile.active === false) {
          await supabase.auth.signOut(); // Putus sesi otomatis
          throw new Error(
            "Akun Anda telah dinonaktifkan. Silakan hubungi Admin.",
          );
        }

        const loggedUser: User = {
          id: profile?.id || data.user.id,
          username: profile?.username || inputEmail.split("@")[0],
          name: profile?.name || data.user.user_metadata?.name || "User",
          role: profile?.role || data.user.user_metadata?.role || "cashier",
          active: profile?.active ?? true,
          createdAt: profile?.created_at || data.user.created_at,
        };

        onLoginSuccess(loggedUser);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal masuk ke sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden select-none">
      {/* Background Soft Ambient Elements */}
      <div className="absolute -top-32 -left-32 w-72 h-72 sm:w-96 sm:h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-72 h-72 sm:w-96 sm:h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Responsive Container Card */}
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md border border-slate-200/80 relative z-10">
        {/* Header Store */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-md shadow-orange-500/20">
            <Store size={24} className="sm:w-[26px] sm:h-[26px]" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight px-2 break-words">
            {storeSettings?.name || "Kasir Sistem"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Silakan masuk untuk memulai sesi kasir
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 ml-1">
              Email
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
                size={16}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 ml-1">
              Password
            </label>
            <div className="relative group">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
                size={16}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk Sistem</span>
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 sm:my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-bold tracking-wider text-[10px]">
              Atau
            </span>
          </div>
        </div>

        {/* Contact Developer Button */}
        <a
          href="https://wa.me/6285858581509?text=Halo%20Developer,%20saya%20ingin%20registrasi%20akun%20untuk%20aplikasi%20KasirPRO."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2.5 group cursor-pointer active:scale-[0.98] text-center px-3"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white shrink-0 flex items-center justify-center shadow-xs">
            <MessageSquare size={13} />
          </div>
          <span className="leading-tight text-left sm:text-center">
            Hubungi developer untuk registrasi
          </span>
        </a>
      </div>
    </div>
  );
}
