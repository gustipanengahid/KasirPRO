import React, { useState, useEffect } from "react";
import { Plus, Trash2, Layers, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Category } from "../types";

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Ambil data kategori dari Supabase saat komponen dimuat
  useEffect(() => {
    fetchCategories();

    // Realtime listener agar tabel otomatis sinkron jika ada perubahan data
    const channel = supabase
      .channel("public:categories")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          fetchCategories();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        const formatted: Category[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
        }));
        setCategories(formatted);
      }
    } catch (err: any) {
      console.error("Gagal memuat kategori:", err.message);
    }
  };

  // 2. Fungsi Tambah Kategori ke Supabase
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const newCategory = {
        id: "cat_" + Date.now(),
        name: newCategoryName.trim(),
      };

      const { error } = await supabase.from("categories").insert([newCategory]);

      if (error) throw error;

      setNewCategoryName("");
      fetchCategories();
    } catch (err: any) {
      console.error("Gagal menambah kategori:", err.message);
      setErrorMsg(
        err.message ||
          "Gagal menambahkan kategori. Pastikan nama tidak duplikat.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 3. Fungsi Hapus Kategori dari Supabase
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus kategori ini?"))
      return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
      fetchCategories();
    } catch (err: any) {
      console.error("Gagal menghapus kategori:", err.message);
      alert("Gagal menghapus kategori: " + err.message);
    }
  };

  return (
    <div className="p-0 w-full h-full flex flex-col space-y-4 font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Form Tambah Kategori Minimalis */}
      <form
        onSubmit={handleAddCategory}
        className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-100"
      >
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
          Nama Kategori Baru
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Contoh: Makanan, Minuman, Snack..."
            className="flex-1 bg-slate-50/80 border border-slate-100 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs shrink-0"
          >
            <Plus size={16} />
            {loading ? "Menambahkan..." : "Tambah Kategori"}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-600 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Daftar Kategori Modern */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-50 bg-slate-50/40">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Daftar Kategori Tersimpan ({categories.length})
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-xs font-medium">
              Belum ada kategori tersimpan di database.
            </div>
          ) : (
            <>
              {/* Tampilan Mobile: Kartu Minimalis */}
              <div className="block sm:hidden divide-y divide-slate-50">
                {categories.map((cat, index) => (
                  <div
                    key={cat.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-800 text-xs truncate">
                        {cat.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
                      title="Hapus Kategori"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Tampilan Desktop: Tabel Modern */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="py-3.5 px-5 w-16">No</th>
                      <th className="py-3.5 px-5">Nama Kategori</th>
                      <th className="py-3.5 px-5 text-right w-32">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                    {categories.map((cat, index) => (
                      <tr
                        key={cat.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-5 text-slate-400 font-bold">
                          {index + 1}
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-800">
                          {cat.name}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 font-bold text-xs"
                            title="Hapus Kategori"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
