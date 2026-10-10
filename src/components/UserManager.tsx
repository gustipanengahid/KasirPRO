import React, { useState, useEffect } from "react";
import { User } from "../types";
import { supabase } from "../lib/supabaseClient";
import { Shield, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface UserManagerProps {
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        setUsers(data as User[]);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data user:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("realtime_users_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchUsers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-full h-full p-0 relative flex flex-col space-y-4 font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Notifikasi Minimalis */}
      {notification.show && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium ${
              notification.type === "success"
                ? "bg-slate-900 border-slate-800 text-white"
                : "bg-rose-600 border-rose-500 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={16} className="text-orange-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-white shrink-0" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() =>
                setNotification((prev) => ({ ...prev, show: false }))
              }
              className="ml-2 p-1 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Kartu Utama dengan Header Terintegrasi */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
              Pengguna
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Daftar akun dan hak akses.
            </p>
          </div>
          <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100/50 tracking-wide">
            {users.length} Pengguna Aktif
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Pengguna</th>
                <th className="py-3.5 px-6">Username</th>
                <th className="py-3.5 px-6 text-right">Role / Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2
                        size={16}
                        className="animate-spin text-orange-500"
                      />
                      <span className="text-xs font-bold">
                        Memuat data pengguna...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-12 text-center text-slate-400 text-xs font-medium"
                  >
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center uppercase text-xs shrink-0 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors border border-slate-200/60">
                            {user.name.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-2">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-xl font-black">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {user.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-slate-500 text-xs">
                        {user.username}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-wide ${
                            user.role === "owner"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : user.role === "admin"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          <Shield size={11} className="opacity-70" />
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
