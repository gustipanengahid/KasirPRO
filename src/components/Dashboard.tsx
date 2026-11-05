import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Filter,
  ArchiveRestore,
  CheckCircle2,
  Sparkles,
  X,
  RefreshCw,
  Radio,
  Download,
  CreditCard,
  PieChart as PieIcon,
  Activity,
  Edit3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { Transaction, Product, StoreSettings, User, Category } from "../types";
import { supabase } from "../lib/supabaseClient";

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  onNavigateToStock: () => void;
  storeSettings?: StoreSettings;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
  users: User[];
  onUpdateUsers: (updated: User[]) => void;
  onRealtimeTransactionReceived?: (newTx: Transaction) => void;
}

export default function Dashboard({
  transactions: initialTransactions,
  products,
  categories = [],
  onNavigateToStock,
  onTriggerSync,
  isSyncing = false,
  users = [],
  onUpdateUsers,
  onRealtimeTransactionReceived,
}: DashboardProps) {
  const [localTransactions, setLocalTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [dateRange, setDateRange] = useState<
    "all" | "1month" | "7days" | "today"
  >("all");
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // STATE TARGET BULANAN DARI SUPABASE
  const [monthlyTarget, setMonthlyTarget] = useState<number>(10000000);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [inputTargetValue, setInputTargetValue] = useState("10000000");

  // Fetch Target Bulanan dari Supabase saat komponen dimuat
  useEffect(() => {
    const fetchMonthlyTarget = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "monthly_target")
          .maybeSingle();

        if (data && !error) {
          const parsed = Number(data.value);
          if (!isNaN(parsed) && parsed > 0) {
            setMonthlyTarget(parsed);
          }
        }
      } catch (err) {
        console.error("Gagal memuat target bulanan dari Supabase:", err);
      }
    };

    fetchMonthlyTarget();
  }, []);

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(inputTargetValue);
    if (isNaN(parsed) || parsed <= 0) {
      alert("Masukkan nominal target yang valid.");
      return;
    }

    setMonthlyTarget(parsed);
    setIsTargetModalOpen(false);

    if (supabase) {
      try {
        const { error } = await supabase.from("store_settings").upsert(
          {
            key: "monthly_target",
            value: parsed.toString(),
            updated_at: new Date(),
          },
          { onConflict: "key" },
        );

        if (error) {
          console.error("Gagal menyimpan target ke Supabase:", error);
          setSyncFeedback("Target disimpan lokal, gagal sinkron ke database.");
        } else {
          setSyncFeedback(
            "Target bulanan berhasil diperbarui & disinkronkan ke server!",
          );
        }
      } catch (err) {
        console.error("Error upsert target:", err);
      }
    } else {
      setSyncFeedback("Target bulanan berhasil diperbarui!");
    }

    setTimeout(() => setSyncFeedback(null), 3500);
  };

  useEffect(() => {
    setLocalTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    if (onTriggerSync) {
      onTriggerSync();
    }

    const fetchSupabaseUsers = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from("users").select("*");
        if (error) return;

        if (data) {
          const parsedUsers: User[] = data.map((u: any) => ({
            id: u.id,
            username: u.username || u.email || "User",
            name: u.name || u.full_name || u.username || "Staff",
            role: u.role || "cashier",
            active: u.active ?? true,
            ...(u.pin !== undefined && { pin: u.pin }),
          }));

          onUpdateUsers(parsedUsers);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchSupabaseUsers();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const txChannel = supabase
      .channel("dashboard-realtime-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const newTx = payload.new as Transaction;
          const parsedTx: Transaction = {
            ...newTx,
            total: Number(newTx.total || 0),
            discountTotal: Number(newTx.discountTotal || 0),
            taxTotal: Number(newTx.taxTotal || 0),
            items: Array.isArray(newTx.items) ? newTx.items : [],
          };

          setLocalTransactions((prev) => {
            if (prev.some((t) => t.id === parsedTx.id)) return prev;
            return [parsedTx, ...prev];
          });

          if (onRealtimeTransactionReceived) {
            onRealtimeTransactionReceived(parsedTx);
          }

          setSyncFeedback("Transaksi baru masuk secara Real-time!");
          setTimeout(() => setSyncFeedback(null), 3500);
        },
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(txChannel);
    };
  }, [onRealtimeTransactionReceived]);

  const formatIDR = (num: number) => {
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  };

  const PIE_COLORS = [
    "#f97316",
    "#3b82f6",
    "#10b981",
    "#ec4899",
    "#8b5cf6",
    "#0f172a",
  ];

  const handleManualSync = async () => {
    if (onTriggerSync) {
      try {
        await onTriggerSync();
        setSyncFeedback("Data berhasil diperbarui!");
        setTimeout(() => setSyncFeedback(null), 3000);
      } catch (err) {
        setSyncFeedback("Gagal memperbarui data.");
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    }
  };

  const filteredTransactions = useMemo(() => {
    return localTransactions.filter((t) => {
      const txDate = new Date(t.date);
      const now = new Date();

      if (dateRange === "today") {
        return txDate.toDateString() === now.toDateString();
      } else if (dateRange === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return txDate >= sevenDaysAgo;
      } else if (dateRange === "1month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return txDate >= oneMonthAgo;
      }
      return true;
    });
  }, [localTransactions, dateRange]);

  const metrics = useMemo(() => {
    let salesTotal = 0;
    let costTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const ordersCount = filteredTransactions.length;

    filteredTransactions.forEach((t) => {
      salesTotal += Number(t.total || 0);
      discountTotal += Number(t.discountTotal || 0);
      taxTotal += Number(t.taxTotal || 0);

      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          costTotal += Number(item.costPrice || 0) * Number(item.qty || 0);
        });
      }
    });

    const netProfit = salesTotal - costTotal - discountTotal - taxTotal;
    const profitMargin =
      salesTotal > 0 ? Math.round((netProfit / salesTotal) * 100) : 0;

    return {
      revenue: salesTotal,
      costOfGoods: costTotal,
      discounts: discountTotal,
      tax: taxTotal,
      profit: netProfit,
      margin: profitMargin,
      orders: ordersCount,
    };
  }, [filteredTransactions]);

  const paymentMethodData = useMemo(() => {
    const methodMap: { [key: string]: number } = {
      cash: 0,
      qris: 0,
      transfer: 0,
      lainnya: 0,
    };

    filteredTransactions.forEach((t) => {
      const method = (t.paymentMethod || "cash").toLowerCase();
      if (methodMap[method] !== undefined) {
        methodMap[method] += Number(t.total || 0);
      } else {
        methodMap["lainnya"] += Number(t.total || 0);
      }
    });

    return [
      { name: "Tunai (Cash)", value: methodMap["cash"] },
      { name: "QRIS / Digital", value: methodMap["qris"] },
      { name: "Transfer Bank", value: methodMap["transfer"] },
      { name: "Lainnya", value: methodMap["lainnya"] },
    ].filter((item) => item.value > 0);
  }, [filteredTransactions]);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock);
  }, [products]);

  const dailySalesData = useMemo(() => {
    const datesMap: { [key: string]: any } = {};
    const daysToSeed =
      dateRange === "7days" ? 7 : dateRange === "1month" ? 30 : 7;

    for (let i = daysToSeed - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      datesMap[dateString] = {
        dateStr: dateString,
        Revenue: 0,
        Expenses: 0,
        Profit: 0,
      };
    }

    filteredTransactions.forEach((t) => {
      const dateString = new Date(t.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });

      let tCost = 0;
      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          tCost += Number(item.costPrice || 0) * Number(item.qty || 0);
        });
      }

      const rev = Number(t.total || 0);
      const tax = Number(t.taxTotal || 0);
      const disc = Number(t.discountTotal || 0);
      const tProfit = rev - tCost - disc - tax;

      if (!datesMap[dateString]) {
        datesMap[dateString] = {
          dateStr: dateString,
          Revenue: 0,
          Expenses: 0,
          Profit: 0,
        };
      }
      datesMap[dateString].Revenue += rev;
      datesMap[dateString].Expenses += tCost + tax;
      datesMap[dateString].Profit += tProfit;
    });

    return Object.values(datesMap);
  }, [filteredTransactions, dateRange]);

  const popularCategoriesData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    categories.forEach((cat) => {
      categoriesMap[cat.name] = 0;
    });

    filteredTransactions.forEach((t) => {
      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const catName = prod?.category || "Umum";
          if (categoriesMap[catName] === undefined) {
            categoriesMap[catName] = 0;
          }
          categoriesMap[catName] += Number(item.total || 0);
        });
      }
    });

    const sortedData = Object.entries(categoriesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sortedData.length === 0)
      return [{ name: "Umum", value: 1, actualValue: 0 }];

    const totalRevenue = sortedData.reduce((sum, item) => sum + item.value, 0);

    return sortedData
      .map((item) => ({
        name: item.name,
        value: totalRevenue > 0 ? item.value : 1,
        actualValue: item.value,
      }))
      .slice(0, 5);
  }, [filteredTransactions, products, categories]);

  const handleExportToExcel = () => {
    if (filteredTransactions.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor.");
      return;
    }

    const dailyReportData = dailySalesData
      .map((d) => {
        const dayTxs = filteredTransactions.filter((t) => {
          const str = new Date(t.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          });
          return str === d.dateStr;
        });

        if (dayTxs.length === 0) return null;

        let dayHpp = 0;
        let dayDiscounts = 0;
        let dayTaxes = 0;
        let dayRevenue = 0;

        dayTxs.forEach((t) => {
          dayDiscounts += Number(t.discountTotal || 0);
          dayTaxes += Number(t.taxTotal || 0);
          dayRevenue += Number(t.total || 0);
          if (Array.isArray(t.items)) {
            t.items.forEach((item) => {
              dayHpp += Number(item.costPrice || 0) * Number(item.qty || 0);
            });
          }
        });

        const dayProfit = dayRevenue - dayHpp - dayDiscounts - dayTaxes;

        return {
          Tanggal: d.dateStr,
          "Jumlah Nota": dayTxs.length,
          "Penjualan Kotor (Omset)": dayRevenue,
          "Potongan Diskon": dayDiscounts,
          "Pajak (PPN)": dayTaxes,
          "Biaya Modal (HPP)": dayHpp,
          "Laba Bersih": dayProfit,
        };
      })
      .filter((item) => item !== null);

    const wb = XLSX.utils.book_new();
    const wsDaily = XLSX.utils.json_to_sheet(dailyReportData);
    XLSX.utils.book_append_sheet(wb, wsDaily, "Laporan Harian");
    XLSX.writeFile(wb, `Laporan-${new Date().toISOString().slice(0, 10)}.xlsx`);

    setSyncFeedback("File Excel Laporan berhasil diunduh!");
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/40 p-0 space-y-4 font-sans">
      {/* Header Full-Width Minimalis */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/85 backdrop-blur-md px-5 py-4 rounded-3xl border border-slate-100 shadow-xs transition-all">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base font-bold tracking-tight text-slate-800">
              Dashboard & Analisis Lanjutan
            </h1>
            <span
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isRealtimeActive
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-slate-50 text-slate-400 border-slate-100"
              }`}
            >
              <Radio
                size={10}
                className={
                  isRealtimeActive ? "animate-pulse text-emerald-500" : ""
                }
              />
              {isRealtimeActive ? "Live Sync" : "Connecting"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal">
            Ringkasan aktivitas outlet dan analisis performa bisnis secara
            real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={handleExportToExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
            title="Ekspor laporan ke file Excel"
          >
            <Download size={14} />
            <span>Excel</span>
          </button>

          {onTriggerSync && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 rounded-2xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                size={13}
                className={isSyncing ? "animate-spin text-orange-500" : ""}
              />
              <span>{isSyncing ? "Memperbarui..." : "Sinkronkan"}</span>
            </button>
          )}

          <div className="relative flex-1 sm:flex-none w-full sm:w-44">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar size={13} />
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-100/80 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer appearance-none transition-all"
            >
              <option value="all">Semua Waktu</option>
              <option value="1month">Bulan Ini</option>
              <option value="7days">Minggu Ini</option>
              <option value="today">Hari Ini</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Filter size={11} />
            </div>
          </div>
        </div>
      </div>

      {syncFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full bg-slate-900 text-white text-xs font-semibold p-4 rounded-2xl shadow-lg flex items-center gap-2.5"
        >
          <CheckCircle2 size={16} className="text-orange-400" />
          <span>{syncFeedback}</span>
        </motion.div>
      )}

      {/* Peringatan Stok Menipis */}
      {lowStockItems.length > 0 && (
        <div className="w-full bg-amber-50/60 border border-amber-200/60 rounded-3xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100/80 text-amber-700 rounded-2xl shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-xs">
                Perhatian: Stok Produk Menipis
              </p>
              <p className="text-xs text-amber-700/80 mt-0.5">
                Terdapat{" "}
                <strong className="font-bold">
                  {lowStockItems.length} produk
                </strong>{" "}
                di bawah batas minimum stok. Segera lakukan restock.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToStock}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            Kelola Stok
          </button>
        </div>
      )}

      {/* Bento Grid Utama: Grafik Batang Pendapatan & Kartu Metrik */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="w-full bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Total Pendapatan
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {formatIDR(metrics.revenue)}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold bg-slate-50 px-3 py-1.5 rounded-2xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span className="text-slate-500">Omset</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="text-slate-500">Modal (HPP)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-slate-500">Laba</span>
                </div>
              </div>
            </div>

            <div className="h-[220px] w-full">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailySalesData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateStr"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v: any) => [formatIDR(Number(v)), ""]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: "16px",
                        padding: "10px 14px",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="Revenue"
                      fill="#0f172a"
                      radius={[6, 6, 0, 0]}
                      barSize={8}
                    />
                    <Bar
                      dataKey="Expenses"
                      fill="#cbd5e1"
                      radius={[6, 6, 0, 0]}
                      barSize={8}
                    />
                    <Bar
                      dataKey="Profit"
                      fill="#f97316"
                      radius={[6, 6, 0, 0]}
                      barSize={8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Belum ada data transaksi grafik.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4 mt-4 flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>Sinkronisasi database aktif</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> Live Connected
            </span>
          </div>
        </div>

        {/* Panel Samping Ringkasan */}
        <div className="w-full lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Transaksi Sukses
              </span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {metrics.orders} Nota
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-3">
              <TrendingUp size={13} />
              <span>Performa stabil</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total HPP (Biaya Modal)
              </span>
              <div className="text-xl font-black text-slate-700 mt-1">
                {formatIDR(metrics.costOfGoods)}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-3">
              <ArchiveRestore size={13} className="text-slate-400" />
              <span>Total modal produk terjual</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider block">
                Laba Bersih Otomatis
              </span>
              <div className="text-xl font-black text-white mt-1">
                {formatIDR(metrics.profit)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium mt-3">
              <Sparkles size={13} className="text-orange-400" />
              <span>Dihitung dari (Omset - HPP - Diskon - Pajak)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: GRAFIK TAMBAHAN */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="w-full bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span>Tren Akumulasi Laba Bersih</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded-xl">
                Profit Growth
              </span>
            </div>

            <div className="h-[200px] w-full">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailySalesData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorProfit"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateStr"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v: any) => [
                        formatIDR(Number(v)),
                        "Laba Bersih",
                      ]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Profit"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Belum ada data grafik profit.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Activity size={16} className="text-orange-500" />
                <span>Komparasi Arus Omset vs Biaya HPP</span>
              </h3>
              <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2.5 py-1 rounded-xl">
                Revenue vs Cost
              </span>
            </div>

            <div className="h-[200px] w-full">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailySalesData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateStr"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v: any) => [formatIDR(Number(v)), ""]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Omset"
                    />
                    <Line
                      type="monotone"
                      dataKey="Expenses"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Biaya HPP"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Belum ada data komparasi.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: PIE CHART PEMBAYARAN & KATEGORI */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="w-full bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" />
                <span>Distribusi Metode Pembayaran</span>
              </h3>
            </div>

            <div className="h-[170px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell
                        key={`cell-pay-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatIDR(Number(v))}
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-3 justify-center text-[10px] font-semibold text-slate-500 mt-2">
              {paymentMethodData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  ></span>
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <PieIcon size={16} className="text-purple-500" />
                <span>Kontribusi Kategori Produk Terlaris</span>
              </h3>
            </div>

            <div className="h-[170px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {popularCategoriesData.map((_, index) => (
                      <Cell
                        key={`cell-cat-${index}`}
                        fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatIDR(Number(v))}
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-3 justify-center text-[10px] font-semibold text-slate-500 mt-2">
              {popularCategoriesData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        PIE_COLORS[(index + 2) % PIE_COLORS.length],
                    }}
                  ></span>
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Target Bulanan (Tersinkron di Supabase) & Kartu Informasi */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Target Bulanan (Cloud Sync)
              </span>
              <button
                onClick={() => {
                  setInputTargetValue(monthlyTarget.toString());
                  setIsTargetModalOpen(true);
                }}
                className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                title="Atur Target Bulanan"
              >
                <Edit3 size={12} /> Set
              </button>
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {formatIDR(monthlyTarget)}
            </h3>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                <span>Pencapaian</span>
                <span>
                  {Math.round((metrics.revenue / monthlyTarget) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (metrics.revenue / monthlyTarget) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Rasio Laba / Margin
            </span>
            <div className="my-auto py-3">
              <span className="text-3xl font-black text-slate-900">
                {metrics.margin}%
              </span>
              <span className="block text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">
                {metrics.margin >= 40 ? "Sangat Sehat" : "Normal"}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Perbandingan laba bersih terhadap omset.
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Status Sinkronisasi
            </span>
            <div className="my-auto py-3">
              <span className="text-lg font-black text-emerald-600 flex items-center justify-center gap-1.5">
                <CheckCircle2 size={20} /> Real-Time
              </span>
              <span className="block text-[10px] text-slate-400 mt-1">
                Database Supabase Terhubung
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Pembaruan data otomatis aktif.
          </span>
        </div>
      </div>

      {/* MODAL SETTING TARGET BULANAN */}
      <AnimatePresence>
        {isTargetModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                <h3 className="font-bold text-slate-900 text-sm">
                  Atur Target Omset Bulanan
                </h3>
                <button
                  onClick={() => setIsTargetModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-2xl cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveTarget} className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Nominal Target Baru (Rp)
                  </label>
                  <input
                    type="number"
                    value={inputTargetValue}
                    onChange={(e) => setInputTargetValue(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Contoh: 15000000"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Target ini akan tersimpan di Supabase dan berlaku seragam
                    untuk semua akun kasir/admin.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTargetModalOpen(false)}
                    className="flex-1 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Simpan Target
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
