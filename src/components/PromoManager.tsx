import React, { useState, useEffect } from "react";
import { Tag, Plus, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export function PromoManager() {
  const [promos, setPromos] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchPromos = async () => {
    const { data, error } = await supabase
      .from("promos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPromos(data);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !value) return;

    setIsLoading(true);
    const { error } = await supabase.from("promos").insert([
      {
        code: code.toUpperCase(),
        name,
        type,
        value: Number(value),
        min_purchase: Number(minPurchase) || 0,
        is_active: true,
      },
    ]);

    setIsLoading(false);
    if (!error) {
      setCode("");
      setName("");
      setValue("");
      setMinPurchase("");
      fetchPromos();
    } else {
      alert("Gagal menambah promo: " + error.message);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (confirm("Yakin ingin menghapus promo ini?")) {
      await supabase.from("promos").delete().eq("id", id);
      fetchPromos();
    }
  };

  return (
    <div className="w-full h-full p-0 flex flex-col bg-white font-sans overflow-hidden">
      {/* Header Halaman Full Length */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-xs">
            <Tag size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-800">
              Promo
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Kelola voucher diskon dan penawaran khusus
            </p>
          </div>
        </div>

        <span className="text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-200/50">
          {promos.length} Promo Aktif
        </span>
      </div>

      {/* Form Input Full Width (Tanpa Kartu Mengambang) */}
      <div className="p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
        <form onSubmit={handleAddPromo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Kode Promo
              </label>
              <input
                type="text"
                placeholder=""
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Promo
              </label>
              <input
                type="text"
                placeholder=""
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipe Diskon
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setValue("");
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="percentage">Persentase</option>
                <option value="fixed">Nominal</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Nilai Diskon
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                  {type === "percentage" ? "%" : "Rp"}
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Minimal Belanja (Opsional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-slate-200 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Plus size={16} />
                {isLoading ? "Menyimpan..." : "Simpan Promo"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tabel Full Width Mengisi Sisa Ruang Layar */}
      <div className="flex-1 overflow-auto bg-white min-h-0">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-100 text-[10px] sticky top-0 z-10">
            <tr>
              <th className="p-4 px-6 bg-slate-50">Kode Promo</th>
              <th className="p-4 bg-slate-50">Nama Promo</th>
              <th className="p-4 bg-slate-50">Diskon</th>
              <th className="p-4 bg-slate-50">Min. Belanja</th>
              <th className="p-4 px-6 text-center bg-slate-50">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-orange-50 text-orange-400 rounded-full">
                      <AlertCircle size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-600">
                      Belum Ada Promo
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tambahkan promo baru melalui form di atas.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              promos.map((promo) => (
                <tr
                  key={promo.id}
                  className="hover:bg-orange-50/20 transition-colors"
                >
                  <td className="p-4 px-6">
                    <span className="px-2.5 py-1 bg-orange-50 text-orange-600 font-black rounded-md border border-orange-200/50 text-[11px]">
                      {promo.code}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800">{promo.name}</td>
                  <td className="p-4 font-black text-slate-700">
                    {promo.type === "percentage"
                      ? `${promo.value}%`
                      : `Rp ${Number(promo.value).toLocaleString("id-ID")}`}
                  </td>
                  <td className="p-4 font-medium text-slate-500">
                    {promo.min_purchase > 0
                      ? `Rp ${Number(promo.min_purchase).toLocaleString("id-ID")}`
                      : "Tanpa minimum"}
                  </td>
                  <td className="p-4 px-6 text-center">
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                      title="Hapus Promo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
