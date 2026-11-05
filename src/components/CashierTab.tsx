import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Banknote,
  Check,
  X,
  QrCode,
  Receipt,
  Tag,
} from "lucide-react";
import {
  User,
  Product,
  StoreSettings,
  Transaction,
  TransactionItem,
} from "../types";

import { supabase } from "../lib/supabaseClient";

export interface CashierTabProps {
  products: Product[];
  categories?: string[];
  currentUser?: User | null;
  onCheckoutSuccess: (newTx: Transaction) => void;
  storeSettings: StoreSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

interface CartItem {
  product: Product;
  qty: number;
}

interface PromoItem {
  id: string;
  code?: string;
  name: string;
  discount_type?: "percentage" | "fixed";
  type?: "percentage" | "fixed";
  discount_value?: number;
  discount?: number;
  value?: number;
  min_purchase?: number;
  min_amount?: number;
}

type PaymentMethodType = Transaction["paymentMethod"];

export default function CashierTab({
  products,
  categories: initialCategories = [],
  currentUser,
  onCheckoutSuccess,
  storeSettings,
  isFullscreen,
  onToggleFullscreen,
}: CashierTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [payAmount, setPayAmount] = useState<string>("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [supabaseCategories, setSupabaseCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] =
    useState<boolean>(false);

  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");

  useEffect(() => {
    const fetchDataFromSupabase = async () => {
      setIsLoadingCategories(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("name");

        if (!catError && catData) {
          const fetchedNames = catData
            .map((item: any) => item.name)
            .filter(Boolean);
          setSupabaseCategories(fetchedNames);
        }

        const { data: promoData, error: promoError } = await supabase
          .from("promos")
          .select("*");

        if (!promoError && promoData) {
          setPromos(promoData);
        }
      } catch (err) {
        console.error("Terjadi kesalahan koneksi Supabase:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchDataFromSupabase();
  }, []);

  const dynamicCategories = Array.from(
    new Set([
      ...supabaseCategories,
      ...initialCategories,
      ...products.map((p) => p.category).filter(Boolean),
    ]),
  );

  const displayCategories = ["Semua", ...dynamicCategories];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const productCat = (product.category || "").trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();

    const matchesCategory =
      selectedCategory === "Semua" || productCat === selectedCat;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prevCart;
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prevCart, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            if (newQty > item.product.stock) return item;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
    setPayAmount("");
    setSelectedPromoId("");
  };

  const subTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0,
  );

  const activePromo = promos.find((p) => p.id === selectedPromoId);
  let discountTotal = 0;
  if (activePromo) {
    const minPurchase = Number(
      activePromo.min_purchase ?? activePromo.min_amount ?? 0,
    );
    if (subTotal >= minPurchase) {
      const val = Number(
        activePromo.discount_value ??
          activePromo.discount ??
          activePromo.value ??
          0,
      );
      const type = activePromo.discount_type ?? activePromo.type ?? "fixed";

      if (type === "percentage") {
        discountTotal = (subTotal * val) / 100;
      } else {
        discountTotal = val;
      }
    }
  }

  const taxableAmount = Math.max(0, subTotal - discountTotal);
  const taxTotal = storeSettings.isTaxEnabled
    ? (taxableAmount * (storeSettings?.taxPercentage ?? 0)) / 100
    : 0;
  const grandTotal = taxableAmount + taxTotal;
  const numericPayAmount = Number(payAmount) || 0;
  const changeAmount = numericPayAmount - grandTotal;

  // PERBAIKAN KRITIS: Menggunakan Atomic Transaction / RPC Supabase[cite: 13]
  const handleProcessCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    if (paymentMethod === "cash" && numericPayAmount < grandTotal) return;

    setIsSubmitting(true);

    const formattedItems: TransactionItem[] = cart.map((item) => ({
      productId: item.product.id,
      sku: item.product.sku || "",
      name: item.product.name,
      price: item.product.price,
      costPrice: item.product.costPrice || 0,
      qty: item.qty,
      discount: 0,
      total: item.product.price * item.qty,
    }));

    const detectedCashierName =
      currentUser?.name ||
      currentUser?.username ||
      (currentUser as any)?.fullname ||
      (currentUser as any)?.email ||
      localStorage.getItem("cashier_name") ||
      "Kasir Utama";

    const detectedCashierId =
      currentUser?.id || (currentUser as any)?.uuid || "KASIR-01";

    const txId = "TX-" + Date.now();
    const invoiceNum = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
    const txDate = new Date().toISOString();

    const newTx: Transaction = {
      id: txId,
      invoiceNumber: invoiceNum,
      date: txDate,
      items: formattedItems,
      subTotal,
      discountTotal,
      taxTotal,
      total: grandTotal,
      paymentMethod,
      cashAmount: paymentMethod === "cash" ? numericPayAmount : undefined,
      changeAmount:
        paymentMethod === "cash" ? Math.max(0, changeAmount) : undefined,
      cashierId: detectedCashierId,
      cashierName: detectedCashierName,
    };

    try {
      const { error: rpcError } = await supabase.rpc("process_checkout", {
        p_transaction_id: txId,
        p_invoice_number: invoiceNum,
        p_sub_total: subTotal,
        p_discount_total: discountTotal,
        p_tax_total: taxTotal,
        p_total: grandTotal,
        p_payment_method: paymentMethod,
        p_cashier_id: detectedCashierId,
        p_cashier_name: detectedCashierName,
        p_items: formattedItems,
      });

      if (rpcError) {
        console.error(
          "Gagal memproses transaksi atomik via RPC:",
          rpcError.message,
        );
        alert("Gagal memproses transaksi: " + rpcError.message);
        setIsSubmitting(false);
        return;
      }
    } catch (err: any) {
      console.error("Kesalahan jaringan/database:", err);
      alert("Terjadi kesalahan sistem saat menyimpan transaksi.");
      setIsSubmitting(false);
      return;
    } finally {
      setIsSubmitting(false);
      onCheckoutSuccess(newTx);
      setIsCheckoutOpen(false);
      clearCart();
    }
  };

  return (
    <div
      className={`flex flex-col lg:flex-row gap-3 h-full overflow-y-auto lg:overflow-hidden bg-slate-50/60 p-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
        isFullscreen ? "fixed inset-0 z-50 p-3 bg-slate-50" : ""
      }`}
    >
      {/* KATALOG PRODUK */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0 bg-white rounded-2xl shadow-2xs border border-slate-100 overflow-hidden shrink-0 lg:shrink">
        {/* Search & Header Controls */}
        <div className="p-3 border-b border-slate-50 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/80 border-0 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={onToggleFullscreen}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl cursor-pointer transition-colors shrink-0"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto border-b border-slate-50 bg-white shrink-0 select-none [&::-webkit-scrollbar]:hidden">
          {isLoadingCategories && displayCategories.length <= 1 && (
            <span className="text-xs text-slate-400 italic px-2 shrink-0">
              Memuat kategori...
            </span>
          )}
          {displayCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-orange-500 text-white shadow-xs shadow-orange-500/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid Produk */}
        <div className="flex-1 overflow-y-auto p-3.5 min-h-0 [&::-webkit-scrollbar]:hidden">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingCart size={36} className="mb-2 opacity-20" />
              <p className="text-xs font-semibold">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group flex flex-col justify-between p-2.5 bg-white border border-slate-100 rounded-2xl select-none relative overflow-hidden transition-all h-full hover:border-orange-200 hover:shadow-sm ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed bg-slate-50"
                        : "cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="aspect-square w-full rounded-xl bg-slate-50 mb-2 overflow-hidden flex items-center justify-center shrink-0 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <ShoppingCart className="text-slate-300" size={20} />
                        )}
                        {isOutOfStock && (
                          <span className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                            Habis
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Stok: {product.stock}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between gap-1 shrink-0">
                      <span className="font-extrabold text-xs text-orange-600 truncate">
                        Rp {product.price.toLocaleString("id-ID")}
                      </span>
                      <div className="p-1 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                        <Plus size={12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KERANJANG BELANJA */}
      <div className="w-full lg:w-[340px] min-h-[400px] lg:min-h-0 bg-white rounded-2xl shadow-2xs border border-slate-100 flex flex-col lg:h-full overflow-hidden shrink-0">
        <div className="p-3.5 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-orange-500" />
            <h3 className="font-extrabold text-xs text-slate-800">Keranjang</h3>
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((a, c) => a + c.qty, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-slate-400 hover:text-red-500 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 size={12} />
              <span>Bersihkan</span>
            </button>
          )}
        </div>

        {/* List Items Keranjang */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px] lg:min-h-0 [&::-webkit-scrollbar]:hidden">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingCart size={28} className="mb-2 opacity-20" />
              <p className="text-xs font-semibold">Keranjang kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2.5 bg-slate-50/60 rounded-xl flex items-center justify-between gap-2 border border-slate-100/50"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-xs text-slate-800 truncate">
                    {item.product.name}
                  </h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Rp {item.product.price.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-lg p-0.5 shadow-2xs">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="p-1 hover:bg-slate-50 text-slate-600 rounded cursor-pointer transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-xs font-bold px-1.5 min-w-[18px] text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="p-1 hover:bg-slate-50 text-slate-600 rounded cursor-pointer transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-slate-300 hover:text-red-500 p-1 cursor-pointer transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary & Tombol Bayar */}
        <div className="p-3.5 border-t border-slate-50 bg-white space-y-2 shrink-0">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium">
              Rp {subTotal.toLocaleString("id-ID")}
            </span>
          </div>

          {storeSettings.isTaxEnabled && (
            <div className="flex justify-between text-xs text-slate-500">
              <span>Pajak ({storeSettings.taxPercentage}%)</span>
              <span className="font-medium">
                Rp {taxTotal.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-100">
            <span>Total Transaksi</span>
            <span className="text-orange-600 font-black text-sm">
              Rp {grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full mt-1.5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20"
          >
            <Banknote size={15} />
            <span>Bayar Sekarang</span>
          </button>
        </div>
      </div>

      {/* MODAL PEMBAYARAN KASIR (Barcode QRIS Diperbesar) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Header Modal */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Receipt size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Konfirmasi Pembayaran
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Selesaikan transaksi penjualan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body Content (Responsive Scrollable) */}
            <div className="p-5 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* Total Tagihan Banner Ringkas */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                    Total Tagihan
                  </span>
                  <span className="text-lg font-black text-orange-400 tracking-tight">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                    Item
                  </span>
                  <span className="text-xs font-bold text-white">
                    {cart.reduce((a, c) => a + c.qty, 0)} Pcs
                  </span>
                </div>
              </div>

              {/* Promo / Voucher */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={11} className="text-orange-500" /> Diskon / Promo
                </label>
                <select
                  value={selectedPromoId}
                  onChange={(e) => setSelectedPromoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/65 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer transition-all"
                >
                  <option value="">-- Pilih Promo (Opsional) --</option>
                  {promos.map((promo) => {
                    const promoVal = Number(
                      promo.discount_value ??
                        promo.discount ??
                        promo.value ??
                        0,
                    );
                    const promoType =
                      promo.discount_type ?? promo.type ?? "fixed";
                    return (
                      <option key={promo.id} value={promo.id}>
                        {promo.name} (
                        {promoType === "percentage"
                          ? `${promoVal}%`
                          : `Rp ${promoVal.toLocaleString("id-ID")}`}
                        )
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Metode Pembayaran */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "cash"
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs shadow-orange-500/25"
                        : "bg-slate-50 text-slate-600 border-slate-200/65 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote size={14} /> Tunai
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qris")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "qris"
                        ? "bg-orange-500 text-white border-orange-500 shadow-xs shadow-orange-500/25"
                        : "bg-slate-50 text-slate-600 border-slate-200/65 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode size={14} /> QRIS
                  </button>
                </div>
              </div>

              {/* Input Tunai atau Tampilan QRIS (Barcode Diperbesar) */}
              {paymentMethod === "cash" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Uang Diterima
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200/65 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/65 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  {/* BARCODE QRIS DIPERBESAR MENJADI w-44 h-44 */}
                  <img
                    src="/qris.png"
                    alt="Kode QRIS"
                    className="w-44 h-44 object-contain mb-2.5 rounded-xl bg-white p-2 border border-slate-100 shadow-xs"
                  />
                  <span className="text-xs text-slate-800 font-bold">
                    Scan QRIS untuk pembayaran digital
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Mendukung semua aplikasi e-wallet & mobile banking
                  </span>
                </div>
              )}

              {/* Rincian Finansial Singkat */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Diskon Promo</span>
                    <span>- Rp {discountTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {storeSettings.isTaxEnabled && (
                  <div className="flex justify-between text-slate-500">
                    <span>Pajak ({storeSettings.taxPercentage}%)</span>
                    <span>Rp {taxTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {paymentMethod === "cash" && (
                  <div className="flex justify-between items-center font-bold pt-1">
                    <span className="text-slate-500">Kembalian</span>
                    <span
                      className={
                        changeAmount < 0
                          ? "text-rose-500"
                          : "text-emerald-600 font-black text-sm"
                      }
                    >
                      Rp {Math.max(0, changeAmount).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>

              {/* Tombol Aksi Selesaikan Transaksi */}
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  (paymentMethod === "cash" && numericPayAmount < grandTotal)
                }
                onClick={handleProcessCheckout}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-slate-200 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm shadow-orange-500/20 flex items-center justify-center gap-2 mt-1"
              >
                {isSubmitting ? (
                  <span>Memproses Transaksi...</span>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Selesaikan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
