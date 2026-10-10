import React, { useState, useEffect } from "react";
import {
  Search,
  Printer,
  Trash2,
  Calendar,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  User,
} from "lucide-react";
import { Transaction, StoreSettings } from "../types";
import { supabase } from "../lib/supabaseClient";

interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onReprint: (tx: Transaction) => void;
  storeSettings: StoreSettings;
  currentUserRole?: string;
}

export default function TransactionHistory({
  transactions,
  setTransactions,
  onReprint,
  storeSettings,
  currentUserRole,
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Ambil data transaksi otomatis dari Supabase saat komponen dimuat
  const fetchTransactionsFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil data dari Supabase:", error.message);
      } else if (data && data.length > 0) {
        // Mapping dari skema Supabase (snake_case) ke objek TypeScript (camelCase)
        const formattedTxs: Transaction[] = data.map((item: any) => ({
          id: item.id,
          invoiceNumber: item.invoice_number,
          date: item.created_at, // Mapping dari `created_at`
          items: item.items_json || [], // Mapping dari `items_json`
          subTotal: Number(item.sub_total || item.total_amount || 0),
          discountTotal: Number(item.discount_total || 0),
          taxTotal: Number(item.tax_total || 0),
          total: Number(item.total_amount || 0), // Mapping dari `total_amount`
          paymentMethod: item.payment_method,
          cashAmount: Number(item.cash_amount || 0),
          changeAmount: Number(item.change_amount || 0),
          cashierId: item.cashier_id,
          cashierName: item.cashier_name || "Kasir",
        }));

        setTransactions(formattedTxs);
        localStorage.setItem("kp_transactions", JSON.stringify(formattedTxs));
      }
    } catch (err) {
      console.error("Kesalahan jaringan saat memuat data Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsFromSupabase();
  }, []);

  // Filter transaksi berdasarkan nomor invoice, nama kasir, atau metode pembayaran
  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cashierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteTransaction = async (id: string) => {
    if (currentUserRole !== "owner") {
      alert("Hanya Owner yang memiliki hak untuk menghapus data transaksi!");
      return;
    }

    if (
      window.confirm(
        "Apakah Anda yakin ingin menghapus catatan transaksi ini dari sistem dan cloud?",
      )
    ) {
      // 1. Hapus dari Supabase
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Gagal menghapus dari Supabase:", error.message);
        alert("Gagal menghapus data dari database cloud Supabase.");
        return;
      }

      // 2. Perbarui State & LocalStorage lokal
      const updated = transactions.filter((tx) => tx.id !== id);
      setTransactions(updated);
      localStorage.setItem("kp_transactions", JSON.stringify(updated));

      if (selectedTxDetail?.id === id) {
        setSelectedTxDetail(null);
      }
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Bagian Header & Pencarian */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
              Transaksi
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Total {transactions.length} transaksi tercatat
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Cari No. Invoice / Kasir..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Tabel Daftar Transaksi */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/60 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold">
              {isLoading
                ? "Memuat data dari Supabase..."
                : "Tidak ada riwayat transaksi ditemukan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">No. Invoice</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Kasir</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Total Belanja</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-1.5 pt-3.5">
                      <User size={13} className="text-slate-400" />
                      <span>{tx.cashierName || "Kasir"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px]">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedTxDetail(tx)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => onReprint(tx)}
                          className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg cursor-pointer transition-colors"
                          title="Cetak Ulang Struk"
                        >
                          <Printer size={14} />
                        </button>
                        {currentUserRole === "owner" && (
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Transaksi */}
      {selectedTxDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Detail Nota
                </h3>
                <p className="text-[10px] text-slate-400">
                  {selectedTxDetail.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Waktu Transaksi</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedTxDetail.date)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Kasir Bertugas</span>
                <span className="font-semibold text-slate-800">
                  {selectedTxDetail.cashierName || "Kasir"}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Metode Pembayaran</span>
                <span className="font-semibold uppercase text-slate-800">
                  {selectedTxDetail.paymentMethod}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Daftar Item
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedTxDetail.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.qty}x @ {formatRupiah(item.price)}
                      </p>
                    </div>
                    <span className="font-extrabold text-slate-800">
                      {formatRupiah(item.total || item.qty * item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatRupiah(selectedTxDetail.subTotal)}</span>
              </div>
              {selectedTxDetail.taxTotal > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Pajak</span>
                  <span>{formatRupiah(selectedTxDetail.taxTotal)}</span>
                </div>
              )}
              {selectedTxDetail.discountTotal > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Diskon</span>
                  <span>-{formatRupiah(selectedTxDetail.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-100">
                <span>Total Pembayaran</span>
                <span className="text-orange-600">
                  {formatRupiah(selectedTxDetail.total)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  onReprint(selectedTxDetail);
                  setSelectedTxDetail(null);
                }}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <Printer size={15} />
                Cetak Struk Fisik
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
