import React, { useState, useEffect, useRef } from "react";
import {
  LogOut,
  ShoppingBag,
  BarChart3,
  Database,
  AlertTriangle,
  CheckCircle,
  History,
  Settings,
  Menu,
  Users,
  X,
  Layers,
  Tag,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 1. IMPOR KLIEN SUPABASE
import { supabase } from "./lib/supabaseClient";

// 2. IMPOR TIPE & DATA AWAL
import {
  Product,
  Category,
  Transaction,
  User,
  StoreSettings,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
} from "./types";

// 3. IMPOR KOMPONEN
import Login from "./components/Login";
import CashierTab from "./components/CashierTab";
import Dashboard from "./components/Dashboard";
import InventoryManager from "./components/InventoryManager";
import ThermalReceipt from "./components/ThermalReceipt";
import TransactionHistory from "./components/TransactionHistory";
import SettingsTab from "./components/SettingsTab";
import { UserManager } from "./components/UserManager";
import CategoryManager from "./components/CategoryManager";
import { PromoManager } from "./components/PromoManager";

const INITIAL_SEED_SETTINGS = {
  id: 1,
  name: "Kasir Pintar",
  address: "Joho, Mojolaban, Kab. Sukoharjo",
  phone: "0858-4288-5498",
  isTaxEnabled: true,
  taxPercentage: 10,
};

export default function App() {
  const lastLocalUpdate = useRef<number>(0);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Status Koneksi Internet
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // State Terpusat untuk Produk
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem("kp_products");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Gagal membaca produk dari cache lokal:", e);
      }
    }
    return [];
  });

  // State Kategori
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("kp_categories");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Gagal membaca kategori dari cache lokal:", e);
      }
    }
    return INITIAL_CATEGORIES || [];
  });

  // State Transaksi
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("kp_transactions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Gagal memparsing riwayat transaksi:", e);
      }
    }
    return INITIAL_TRANSACTIONS || [];
  });

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem("kb_store_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {
        console.error("Gagal membaca pengaturan dari cache lokal:", e);
      }
    }
    return INITIAL_SEED_SETTINGS;
  });

  // State Antarmuka (UI) - "menulist" telah dihapus dari tipe
  const [activeTab, setActiveTab] = useState<
    | "cashier"
    | "dashboard"
    | "inventory"
    | "history"
    | "settings"
    | "users"
    | "kategori"
    | "promos"
  >("cashier");

  const [selectedTxForReceipt, setSelectedTxForReceipt] =
    useState<Transaction | null>(null);
  const [isPosFullscreen, setIsPosFullscreen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [alertNotification, setAlertNotification] = useState<{
    message: string;
    type: "success" | "warning";
  } | null>(null);

  // Inisialisasi Settings Database
  const initializeAndSeedDatabase = async () => {
    try {
      const { data: setDb, error: setError } = await supabase
        .from("settings")
        .select("*");

      if (setError) {
        console.error("Detail Error Fetch Settings:", setError);
      } else if (!setDb || setDb.length === 0) {
        await supabase.from("settings").upsert([INITIAL_SEED_SETTINGS]);
      }
    } catch (err) {
      console.error("Gagal inisialisasi settings:", err);
    }
  };

  const fetchCloudProducts = async () => {
    try {
      const { data, error } = await supabase.from("items").select("*");
      if (error) {
        console.error("Gagal mengambil produk:", error);
        return;
      }
      if (data) {
        const formattedProducts: Product[] = data.map((item: any) => ({
          id: item.id,
          sku: item.code || item.sku || "",
          name: item.name,
          category: item.category || "Umum",
          price: Number(item.price || 0),
          costPrice: Number(item.cost || item.cost_price || 0),
          stock: Number(item.stock || 0),
          minStock: Number(item.min_stock || 5),
          imageUrl: item.image_url,
        }));
        setProducts(formattedProducts);
        localStorage.setItem("kp_products", JSON.stringify(formattedProducts));
      }
    } catch (err) {
      console.error("Gagal mengambil produk dari Supabase:", err);
    }
  };

  const fetchCloudTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil transaksi:", error);
        return;
      }

      if (data) {
        const formattedTxs: Transaction[] = data.map((tx: any) => ({
          id: tx.id,
          invoiceNumber: tx.invoice_number,
          total: Number(tx.total || tx.total_amount || 0),
          subTotal: Number(tx.sub_total || tx.total || tx.total_amount || 0),
          discountTotal: Number(tx.discount_total || 0),
          taxTotal: Number(tx.tax_total || 0),
          paymentMethod: tx.payment_method,
          cashierId: tx.cashier_id,
          cashierName: tx.cashier_name || "Kasir",
          items: tx.items_json || [],
          date: tx.created_at || tx.date,
        }));
        setTransactions(formattedTxs);
        localStorage.setItem("kp_transactions", JSON.stringify(formattedTxs));
      }
    } catch (err) {
      console.error("Gagal mengambil transaksi dari Supabase:", err);
    }
  };

  const fetchCloudUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) return;
      if (data) {
        const formattedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          active: u.active ?? true,
          createdAt: u.created_at,
        }));
        setUsers(formattedUsers);
      }
    } catch (err) {
      console.error("Gagal mengambil user:", err);
    }
  };

  const fetchCloudSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();
      if (data && !error) {
        setStoreSettings(data);
        localStorage.setItem("kb_store_settings", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Gagal mengambil pengaturan toko:", err);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const runInisialisasi = async () => {
      await initializeAndSeedDatabase();
      await fetchCloudProducts();
      await fetchCloudTransactions();
      await fetchCloudUsers();
      await fetchCloudSettings();
    };

    runInisialisasi();

    const channel = supabase
      .channel("app-realtime-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => fetchCloudProducts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchCloudTransactions(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => fetchCloudUsers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => fetchCloudSettings(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const syncUserSession = async (sessionUser: any) => {
      if (!sessionUser) {
        setCurrentUser(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", sessionUser.id);

        const profile = data && data.length > 0 ? data[0] : null;

        if (profile && !error) {
          const userObj: User = {
            id: profile.id,
            username: profile.username,
            name: profile.name,
            role: profile.role,
            active: profile.active ?? true,
            createdAt: profile.created_at,
          };
          setCurrentUser(userObj);

          if (profile.role === "cashier") setActiveTab("cashier");
          else if (profile.role === "owner") setActiveTab("dashboard");
          else setActiveTab("inventory");
        } else {
          const userMeta = sessionUser.user_metadata || {};
          setCurrentUser({
            id: sessionUser.id,
            username:
              userMeta.username || sessionUser.email?.split("@")[0] || "user",
            name: userMeta.name || "User",
            role: userMeta.role || "cashier",
            active: true,
            createdAt: sessionUser.created_at,
          });
        }
      } catch (err) {
        console.error("Gagal menyinkronkan profil user:", err);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncUserSession(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUserSession(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const triggerNotification = (
    message: string,
    type: "success" | "warning" = "success",
  ) => {
    setAlertNotification({ message, type });
    setTimeout(() => setAlertNotification(null), 4000);
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem("kp_users", JSON.stringify(updatedUsers));
    triggerNotification("Data personel berhasil diperbarui.", "success");
  };

  const handleCheckoutSuccess = async (newTx: Transaction) => {
    const updatedTxs = [newTx, ...transactions];
    lastLocalUpdate.current = Date.now();

    setTransactions(updatedTxs);
    localStorage.setItem("kp_transactions", JSON.stringify(updatedTxs));

    try {
      const { error } = await supabase.from("transactions").upsert([
        {
          id: newTx.id,
          invoice_number: newTx.invoiceNumber,
          total_amount: newTx.total,
          sub_total: newTx.subTotal || newTx.total,
          discount_total: newTx.discountTotal || 0,
          tax_total: newTx.taxTotal || 0,
          payment_method: newTx.paymentMethod,
          cashier_id: currentUser?.id,
          cashier_name: currentUser?.name || "Kasir",
          items_json: newTx.items,
          created_at: newTx.date,
        },
      ]);

      if (error) {
        console.error("Gagal menyimpan ke Supabase:", error.message);
      }
    } catch (err) {
      console.error("Kesalahan jaringan/koneksi Supabase:", err);
    }

    const updatedProducts = products.map((p) => {
      const soldItem = newTx.items.find(
        (item: any) => (item.productId || item.id) === p.id,
      );
      if (soldItem) {
        return { ...p, stock: Math.max(0, p.stock - soldItem.qty) };
      }
      return p;
    });

    setProducts(updatedProducts);
    localStorage.setItem("kp_products", JSON.stringify(updatedProducts));

    for (const item of newTx.items) {
      const targetId = item.productId;
      const currentProd = updatedProducts.find((p) => p.id === targetId);
      if (currentProd) {
        await supabase
          .from("items")
          .update({ stock: currentProd.stock })
          .eq("id", targetId);
      }
    }

    setSelectedTxForReceipt(newTx);
    triggerNotification(
      "Transaksi Kasir Selesai & Sukses ke Cloud!",
      "success",
    );
  };

  const handlePrintReceipt = (tx: Transaction) => {
    setSelectedTxForReceipt(tx);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedTxForReceipt(null);
    setIsLogoutConfirmOpen(false);
    setIsMobileMenuOpen(false);
    triggerNotification("Berhasil keluar dari sistem.", "success");
  };

  return (
    <div
      id="app-root-container"
      className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800"
    >
      {!isOnline && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-white">
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            Koneksi Terputus
          </h1>
          <p className="text-sm text-slate-500">
            Perangkat Anda tidak terhubung ke jaringan.
          </p>
        </div>
      )}

      <AnimatePresence>
        {alertNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 w-80 text-xs font-semibold ${
              alertNotification.type === "success"
                ? "bg-orange-50 border-orange-100 text-orange-800"
                : "bg-amber-50 border-amber-100 text-amber-800"
            }`}
          >
            {alertNotification.type === "success" ? (
              <CheckCircle className="text-orange-500 shrink-0" size={18} />
            ) : (
              <AlertTriangle className="text-amber-500 shrink-0" size={18} />
            )}
            <span>{alertNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentUser ? (
        <Login
          storeSettings={storeSettings}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            triggerNotification(`Selamat datang, ${user.name}!`, "success");
          }}
        />
      ) : (
        <div className="min-h-screen bg-slate-100/70 flex flex-col md:flex-row font-sans antialiased text-slate-800 overflow-hidden h-screen">
          {/* SIDEBAR */}
          {!isPosFullscreen && !selectedTxForReceipt && (
            <aside className="hidden md:flex w-[190px] bg-white text-slate-700 flex-col justify-between shrink-0 h-screen select-none z-40 border-r border-slate-200/50">
              <div className="p-3.5 flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5 shrink-0">
                  <div className="min-w-0">
                    <h1 className="font-black text-base tracking-tight text-slate-900 leading-tight uppercase truncate">
                      KASIR PRO
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      {storeSettings.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5 flex-1 overflow-y-auto pr-0.5">
                  {["owner"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("dashboard");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "dashboard"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <BarChart3
                        size={14}
                        className={
                          activeTab === "dashboard"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Dashboard</span>
                    </button>
                  )}

                  {["owner", "admin", "cashier"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("cashier");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "cashier"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <ShoppingBag
                        size={14}
                        className={
                          activeTab === "cashier"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Kasir</span>
                    </button>
                  )}

                  {["owner", "admin", "cashier"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("history");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "history"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <History
                        size={14}
                        className={
                          activeTab === "history"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Transaksi</span>
                    </button>
                  )}

                  {["owner"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("kategori");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "kategori"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <Layers
                        size={14}
                        className={
                          activeTab === "kategori"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Kategori</span>
                    </button>
                  )}

                  {["owner"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("inventory");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "inventory"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <Database
                        size={14}
                        className={
                          activeTab === "inventory"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Stok</span>
                    </button>
                  )}

                  {["owner"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("promos");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "promos"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <Tag
                        size={14}
                        className={
                          activeTab === "promos"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Diskon</span>
                    </button>
                  )}

                  {["owner"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("users");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "users"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <Users
                        size={14}
                        className={
                          activeTab === "users"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>User</span>
                    </button>
                  )}

                  {["owner"].includes(currentUser.role) && (
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setSelectedTxForReceipt(null);
                      }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all ${
                        activeTab === "settings"
                          ? "bg-orange-500/8 text-slate-900 font-extrabold border-l-[3px] border-orange-500 rounded-l-none pl-[7px]"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]"
                      }`}
                    >
                      <Settings
                        size={14}
                        className={
                          activeTab === "settings"
                            ? "text-orange-500"
                            : "text-slate-400"
                        }
                      />
                      <span>Pengaturan</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 mt-auto shrink-0 space-y-2 pb-1 bg-white">
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-[9px] uppercase flex items-center justify-center shrink-0">
                      {currentUser.role.substring(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-400">
                        {currentUser.role === "owner"
                          ? "Owner Akun"
                          : "Petugas"}
                      </p>
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {currentUser.name}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    className="w-full p-1.5 px-2 hover:bg-red-50 text-red-600 border border-slate-100 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide bg-slate-50/50"
                  >
                    <LogOut size={11} />
                    Keluar Sistem
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* SIDEBAR MOBILE (DRAWER) */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 md:hidden flex">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                />

                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="relative w-[240px] bg-white text-slate-700 flex flex-col justify-between h-full shadow-2xl z-10"
                >
                  <div className="p-4 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                      <div>
                        <h1 className="font-black text-base tracking-tight text-slate-900 leading-tight uppercase">
                          KASIR PRO
                        </h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {storeSettings.name}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
                      {["owner"].includes(currentUser.role) && (
                        <button
                          onClick={() => {
                            setActiveTab("dashboard");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "dashboard"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <BarChart3
                            size={16}
                            className={
                              activeTab === "dashboard"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Dashboard</span>
                        </button>
                      )}

                      {["owner", "admin", "cashier"].includes(
                        currentUser.role,
                      ) && (
                        <button
                          onClick={() => {
                            setActiveTab("cashier");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "cashier"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <ShoppingBag
                            size={16}
                            className={
                              activeTab === "cashier"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Kasir</span>
                        </button>
                      )}

                      {["owner", "admin", "cashier"].includes(
                        currentUser.role,
                      ) && (
                        <button
                          onClick={() => {
                            setActiveTab("history");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "history"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <History
                            size={16}
                            className={
                              activeTab === "history"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Transaksi</span>
                        </button>
                      )}

                      {["owner"].includes(currentUser.role) && (
                        <button
                          onClick={() => {
                            setActiveTab("kategori");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "kategori"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Layers
                            size={16}
                            className={
                              activeTab === "kategori"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Kategori</span>
                        </button>
                      )}

                      {["owner"].includes(currentUser.role) && (
                        <button
                          onClick={() => {
                            setActiveTab("inventory");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "inventory"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Database
                            size={16}
                            className={
                              activeTab === "inventory"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Stok</span>
                        </button>
                      )}

                      {["owner"].includes(currentUser.role) && (
                        <button
                          onClick={() => {
                            setActiveTab("promos");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "promos"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Tag
                            size={16}
                            className={
                              activeTab === "promos"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Diskon</span>
                        </button>
                      )}

                      {["owner"].includes(currentUser.role) && (
                        <button
                          onClick={() => {
                            setActiveTab("users");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "users"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Users
                            size={16}
                            className={
                              activeTab === "users"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>User</span>
                        </button>
                      )}

                      {["owner"].includes(currentUser.role) && (
                        <button
                          onClick={() => {
                            setActiveTab("settings");
                            setSelectedTxForReceipt(null);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full p-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === "settings"
                              ? "bg-orange-50 text-orange-600 font-extrabold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Settings
                            size={16}
                            className={
                              activeTab === "settings"
                                ? "text-orange-500"
                                : "text-slate-400"
                            }
                          />
                          <span>Pengaturan</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-auto shrink-0 space-y-2">
                      <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-[10px] uppercase flex items-center justify-center shrink-0">
                          {currentUser.role.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                            {currentUser.role === "owner"
                              ? "Owner Akun"
                              : "Petugas"}
                          </p>
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {currentUser.name}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsLogoutConfirmOpen(true);
                        }}
                        className="w-full p-2.5 hover:bg-red-50 text-red-600 border border-slate-100 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-extrabold uppercase bg-slate-50/50"
                      >
                        <LogOut size={14} />
                        Keluar Sistem
                      </button>
                    </div>
                  </div>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50 relative">
            {!isPosFullscreen && !selectedTxForReceipt && (
              <header className="bg-white border-b border-slate-200 sticky top-0 z-30 select-none shrink-0 md:shadow-xs">
                <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="md:hidden p-2 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-200"
                    >
                      <Menu size={20} />
                    </button>

                    <div>
                      <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
                        {activeTab === "dashboard" && "Dashboard Overview"}
                        {activeTab === "cashier" && "Cashier View"}
                        {activeTab === "history" && "Riwayat Transaksi"}
                        {activeTab === "inventory" && "Stok Barang"}
                        {activeTab === "kategori" && "Kategori Produk"}
                        {activeTab === "promos" && "Diskon / Promo"}
                        {activeTab === "users" && "Pengguna Sistem"}
                        {activeTab === "settings" && "Setelan Operasional"}
                      </h2>
                    </div>
                  </div>

                  {/* Tanggal dan Jam Realtime */}
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-800 tracking-wider">
                      {currentDateTime.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 capitalize">
                      {currentDateTime.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </header>
            )}

            <main className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50">
              {selectedTxForReceipt ? (
                <div className="animate-fade-in p-2">
                  <div className="mb-4 text-center select-none">
                    <h3 className="font-extrabold text-slate-800 text-base flex justify-center items-center gap-1.5">
                      <CheckCircle className="text-orange-500" size={20} />
                      Transaksi Kasir Berhasil Dicatat!
                    </h3>
                  </div>
                  <ThermalReceipt
                    transaction={selectedTxForReceipt}
                    onBack={() => setSelectedTxForReceipt(null)}
                    storeSettings={storeSettings}
                  />
                </div>
              ) : (
                <>
                  {activeTab === "cashier" && (
                    <CashierTab
                      products={products}
                      categories={categories.map((c: any) => c.name || c)}
                      currentUser={currentUser}
                      onCheckoutSuccess={handleCheckoutSuccess}
                      storeSettings={storeSettings}
                      isFullscreen={isPosFullscreen}
                      onToggleFullscreen={() =>
                        setIsPosFullscreen(!isPosFullscreen)
                      }
                    />
                  )}

                  {activeTab === "history" && (
                    <TransactionHistory
                      transactions={transactions}
                      setTransactions={setTransactions}
                      onReprint={handlePrintReceipt}
                      storeSettings={storeSettings}
                      currentUserRole={currentUser?.role}
                    />
                  )}

                  {activeTab === "dashboard" && (
                    <Dashboard
                      transactions={transactions}
                      products={products}
                      categories={categories}
                      onNavigateToStock={() => setActiveTab("inventory")}
                      storeSettings={storeSettings}
                      users={users}
                      onUpdateUsers={handleUpdateUsers}
                    />
                  )}

                  {activeTab === "inventory" && (
                    <InventoryManager
                      products={products}
                      setProducts={setProducts}
                      categories={categories}
                    />
                  )}

                  {activeTab === "kategori" && <CategoryManager />}

                  {activeTab === "promos" && currentUser.role === "owner" && (
                    <PromoManager />
                  )}

                  {activeTab === "users" && currentUser.role === "owner" && (
                    <UserManager currentUser={currentUser} />
                  )}

                  {activeTab === "settings" && (
                    <SettingsTab
                      settings={storeSettings}
                      onSaveSettings={async (
                        updated,
                        silent = false,
                        persistToServer = false,
                      ) => {
                        setStoreSettings(updated);
                        localStorage.setItem(
                          "kb_store_settings",
                          JSON.stringify(updated),
                        );
                        if (persistToServer) {
                          const cleanPayload = {
                            id: updated.id || 1,
                            name: updated.name,
                            address: updated.address,
                            phone: updated.phone,
                            istaxenabled:
                              updated.isTaxEnabled ??
                              updated.is_tax_enabled ??
                              false,
                            taxpercentage:
                              updated.taxPercentage ??
                              updated.tax_percentage ??
                              0,
                          };

                          const { error } = await supabase
                            .from("settings")
                            .upsert([cleanPayload]);

                          if (error) {
                            console.error(
                              "Gagal simpan ke Supabase:",
                              error.message,
                            );
                          }
                        }
                        if (!silent)
                          triggerNotification(
                            "Pengaturan toko disimpan!",
                            "success",
                          );
                      }}
                    />
                  )}
                </>
              )}
            </main>
          </div>

          <AnimatePresence>
            {isLogoutConfirmOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
                >
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                    <LogOut size={22} />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Konfirmasi Keluar Aplikasi
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Apakah Anda yakin ingin keluar dari sistem kasir?
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className="p-2 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleLogout}
                      className="p-2 bg-red-600 text-white font-extrabold rounded-xl text-xs"
                    >
                      Keluar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
