import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Category } from "../types";
import { supabase } from "../lib/supabaseClient";

interface InventoryManagerProps {
  products?: Product[];
  categories?: Category[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  onAddProduct?: (newProdData: Omit<Product, "id">) => void;
  onUpdateProduct?: (updatedProd: Product) => void;
}

const compressImageToBase64 = (
  file: File,
  maxWidth = 300,
  maxHeight = 300,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((height * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/png");
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const formatCurrency = (value: number | string) => {
  if (value === "" || value === undefined || value === null) return "0";
  const numericValue =
    typeof value === "string" ? value.replace(/\D/g, "") : value.toString();
  if (!numericValue) return "0";
  const num = Number(numericValue);
  return isNaN(num) ? "0" : num.toLocaleString("id-ID");
};

const parseCurrency = (value: string) => {
  const numericValue = value.replace(/\D/g, "");
  return numericValue ? parseInt(numericValue, 10) : 0;
};

export default function InventoryManager({
  products = [],
  categories = [],
  setProducts,
  onAddProduct,
  onUpdateProduct,
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);

  const [categoriesList, setCategoriesList] = useState<Category[]>(categories);

  useEffect(() => {
    if (setProducts) {
      fetchProducts();
    }
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (categories && categories.length > 0) {
      setCategoriesList(categories);
      return;
    }

    const { data, error } = await supabase.from("categories").select("*");

    if (error) {
      console.error("Gagal memuat kategori dari Supabase:", error.message);
      setCategoriesList([
        { id: "1", name: "Makanan" },
        { id: "2", name: "Minuman" },
        { id: "3", name: "Snack" },
        { id: "4", name: "Umum" },
      ]);
    } else if (data && data.length > 0) {
      const formattedCategories: Category[] = data.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || "",
      }));
      setCategoriesList(formattedCategories);
    } else {
      setCategoriesList([
        { id: "1", name: "Makanan" },
        { id: "2", name: "Minuman" },
        { id: "3", name: "Snack" },
        { id: "4", name: "Umum" },
      ]);
    }
  };

  const fetchProducts = async () => {
    if (!setProducts) return;
    setLoading(true);
    const { data, error } = await supabase.from("items").select("*");
    if (error) {
      console.error("Error fetching products:", error.message);
      showToast("Gagal memuat produk dari database.", "warning");
    } else if (data) {
      const formattedProducts: Product[] = data.map((item: any) => ({
        id: item.id,
        sku: item.sku || `PROD-${item.id}`,
        name: item.name || "",
        category: item.category || "Umum",
        price: Number(item.price) || 0,
        costPrice: Number(item.cost_price ?? item.costPrice) || 0,
        stock: Number(item.stock) || 0,
        minStock: Number(item.min_stock ?? item.minStock) || 5,
        imageUrl: item.image_url || item.imageUrl || "",
      }));
      setProducts(formattedProducts);
    }
    setLoading(false);
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "warning";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "warning" = "warning",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = useMemo(() => {
    return safeProducts.filter((p) => {
      const matchSearch =
        (p.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (p.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [safeProducts, searchTerm, selectedCategory]);

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setSku(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
    setName("");
    setCategory(categoriesList.length > 0 ? categoriesList[0].name : "Umum");
    setPrice(0);
    setCostPrice(0);
    setStock(0);
    setMinStock(5);
    setImageUrl("");
    setUploadStatus("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku || "");
    setName(p.name || "");
    setCategory(p.category || categoriesList[0]?.name || "Umum");
    setPrice(p.price || 0);
    setCostPrice(p.costPrice || 0);
    setStock(p.stock || 0);
    setMinStock(p.minStock ?? 5);
    setImageUrl(p.imageUrl || "");
    setUploadStatus("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      const payload = {
        sku,
        name,
        category,
        price,
        cost_price: costPrice,
        stock,
        min_stock: minStock,
        image_url: imageUrl,
      };

      const { error } = await supabase
        .from("items")
        .update(payload)
        .eq("id", editingProduct.id);

      if (error) {
        console.error("Gagal update produk:", error.message);
        showToast("Gagal memperbarui produk di database.", "warning");
      } else {
        if (onUpdateProduct) {
          onUpdateProduct({
            id: editingProduct.id,
            sku,
            name,
            category,
            price,
            costPrice,
            stock,
            minStock,
            imageUrl,
          });
        }
        if (setProducts) fetchProducts();
        showToast("Produk berhasil diperbarui! ✅", "success");
      }
    } else {
      const payload = {
        sku,
        name,
        category,
        price,
        cost_price: costPrice,
        stock,
        min_stock: minStock,
        image_url: imageUrl,
      };

      const { error } = await supabase.from("items").insert([payload]);

      if (error) {
        console.error("Gagal menambah produk:", error.message);
        showToast("Gagal menambahkan produk ke database.", "warning");
      } else {
        if (onAddProduct) {
          onAddProduct({
            sku,
            name,
            category,
            price,
            costPrice,
            stock,
            minStock,
            imageUrl,
          });
        }
        if (setProducts) fetchProducts();
        showToast("Produk berhasil ditambahkan! ✅", "success");
      }
    }
    setIsFormOpen(false);
  };

  const handleDelete = (p: Product) => {
    setProductToDelete(p);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", productToDelete.id);

    if (error) {
      console.error("Gagal menghapus produk:", error.message);
      showToast("Gagal menghapus produk dari database.", "warning");
    } else {
      if (setProducts) fetchProducts();
      showToast("Produk berhasil dihapus.", "success");
    }
    setProductToDelete(null);
  };

  const handleQuickStock = async (p: Product, change: number) => {
    const currentStock = Number(p.stock) || 0;
    const newStock = Math.max(0, currentStock + change);

    if (setProducts) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, stock: newStock } : item,
        ),
      );
    }

    const { error } = await supabase
      .from("items")
      .update({ stock: newStock })
      .eq("id", p.id);

    if (error) {
      console.error("Gagal memperbarui stok:", error.message);
      if (setProducts) fetchProducts();
    }
  };

  return (
    <div className="space-y-4 w-full h-full p-0 relative flex flex-col font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl shadow-xl border flex items-center gap-2.5 bg-white border-orange-100 text-slate-800 min-w-[280px] max-w-[90vw]"
          >
            <div className="p-1 bg-orange-50 rounded-lg text-orange-500 shrink-0">
              <AlertTriangle size={15} />
            </div>
            <span className="text-xs font-bold leading-normal">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={22} />
              </div>

              <h3 className="font-extrabold text-slate-800 text-sm">
                Konfirmasi Hapus Produk
              </h3>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus produk{" "}
                <span className="font-bold text-slate-700">
                  "{productToDelete.name}"
                </span>
                ? Stok tersisa di gudang saat ini adalah{" "}
                <span className="font-bold">
                  {productToDelete.stock || 0} pcs
                </span>
                . Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="p-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs cursor-pointer transition-colors shadow-sm shadow-red-100"
                >
                  Hapus Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-3 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Cari produk berdasarkan nama atau SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 p-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter
                size={14}
                className="text-slate-400 shrink-0 hidden sm:block"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto p-2.5 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500"
              >
                <option value="all" className="bg-white text-slate-700">
                  Semua Kategori
                </option>
                {categoriesList.map((c) => (
                  <option
                    key={c.id}
                    value={c.name}
                    className="bg-white text-slate-700"
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleOpenAddForm}
              className="w-full sm:w-auto p-2.5 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus size={16} />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-center p-8 text-slate-400 text-xs">
              Memuat data dari Supabase...
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const currentStock = Number(p.stock) || 0;
                    const minStockVal = Number(p.minStock) || 0;
                    const isLowStock = currentStock <= minStockVal;

                    return (
                      <div
                        key={p.id}
                        className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-xl object-contain p-0.5 bg-white shrink-0 border border-slate-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center shrink-0 text-[9px] uppercase font-mono tracking-wider">
                                No Pic
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] text-slate-400 block truncate">
                                {p.sku}
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs truncate">
                                {p.name}
                              </h4>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl font-medium text-[9px] shrink-0">
                            {p.category}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-[11px]">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block font-bold">
                              Modal / HPP
                            </span>
                            <span className="font-medium text-slate-600">
                              Rp {formatCurrency(p.costPrice)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 uppercase block font-bold">
                              Harga Jual
                            </span>
                            <span className="font-bold text-slate-800">
                              Rp {formatCurrency(p.price)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500">
                              Stok:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleQuickStock(p, -1)}
                                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span
                                className={`min-w-6 text-center font-bold px-1.5 py-0.5 rounded-lg text-[11px] ${isLowStock ? "bg-orange-50 text-orange-600 border border-orange-100" : "text-slate-800"}`}
                              >
                                {currentStock}
                              </span>
                              <button
                                onClick={() => handleQuickStock(p, 5)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px] flex items-center justify-center cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditForm(p)}
                              className="p-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center p-8 text-slate-400 text-xs">
                    Tidak ada produk dalam daftar inventaris Anda.
                  </div>
                )}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="py-3.5 px-4">SKU / Kode</th>
                      <th className="py-3.5 px-4">Nama Produk</th>
                      <th className="py-3.5 px-4">Kategori</th>
                      <th className="py-3.5 px-4 text-right">Harga Modal</th>
                      <th className="py-3.5 px-4 text-right">Harga Jual</th>
                      <th className="py-3.5 px-4 text-center">Stok Gudang</th>
                      <th className="py-3.5 px-4 text-center">Batas Aman</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => {
                        const currentStock = Number(p.stock) || 0;
                        const minStockVal = Number(p.minStock) || 0;
                        const isLowStock = currentStock <= minStockVal;

                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-4 px-4 font-mono font-bold text-slate-800">
                              {p.sku}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800">
                              <div className="flex items-center gap-3">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-xl object-contain p-0.5 bg-white shrink-0 border border-slate-100"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center shrink-0 text-[10px] uppercase font-mono tracking-wider">
                                    No Pic
                                  </div>
                                )}
                                <span className="truncate max-w-[200px]">
                                  {p.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl font-medium text-[10px]">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-slate-600">
                              {formatCurrency(p.costPrice)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">
                              {formatCurrency(p.price)}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleQuickStock(p, -1)}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  -
                                </button>

                                <span
                                  className={`min-w-8 text-center font-bold px-2 py-0.5 rounded-lg ${isLowStock ? "bg-orange-50 text-orange-600 font-extrabold border border-orange-100" : "text-slate-800"}`}
                                >
                                  {currentStock}
                                </span>

                                <button
                                  onClick={() => handleQuickStock(p, 5)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold h-6 px-2 rounded-lg text-[10px] flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  +5
                                </button>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center font-bold text-slate-500">
                              {minStockVal}
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditForm(p)}
                                  className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl cursor-pointer transition-colors flex items-center gap-1 font-bold text-xs"
                                  title="Edit"
                                >
                                  <Edit2 size={13} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(p)}
                                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer transition-colors flex items-center gap-1 font-bold text-xs"
                                  title="Hapus"
                                >
                                  <Trash2 size={13} />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center p-8 text-slate-400"
                        >
                          Tidak ada produk dalam daftar inventaris Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-sm">
                {editingProduct
                  ? "Ubah Informasi Produk"
                  : "Tambah Produk Inventaris"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Konfigurasikan HPP, harga jual, dan stok pengaman produk.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Kode SKU / Barcode
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold uppercase text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Kategori Utama
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                  >
                    {categoriesList.map((c) => (
                      <option
                        key={c.id}
                        value={c.name}
                        className="bg-white text-slate-700"
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                  Nama Produk Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Caramel Macchiato"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Biaya Modal (HPP)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[11px] font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      required
                      value={formatCurrency(costPrice)}
                      onChange={(e) =>
                        setCostPrice(parseCurrency(e.target.value))
                      }
                      className="w-full pl-9 pr-3.5 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Harga Jual (Retail)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[11px] font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      required
                      value={formatCurrency(price)}
                      onChange={(e) => setPrice(parseCurrency(e.target.value))}
                      className="w-full pl-9 pr-3.5 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) =>
                      setStock(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                    Batas Minimum (Alert)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStock}
                    onChange={(e) =>
                      setMinStock(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5">
                <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1.5">
                  Foto / Gambar Produk
                </label>
                <div className="flex gap-3.5 items-center">
                  <div className="w-16 h-16 rounded-2xl border border-slate-200 outline-dashed outline-1 outline-slate-300 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="preview"
                          className="w-full h-full object-contain p-1 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl("");
                            setUploadStatus("");
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <Upload className="text-slate-400" size={16} />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      id="product-image-file"
                      accept="image/*"
                      ref={productFileInputRef}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setUploadStatus("Memproses & mengompresi gambar...");
                          const compressedBase64 =
                            await compressImageToBase64(file);
                          setImageUrl(compressedBase64);
                          setUploadStatus("Gambar berhasil dimuat! ✅");
                        } catch (err) {
                          setUploadStatus("Gagal memproses gambar.");
                        }
                      }}
                      className="hidden"
                    />

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => productFileInputRef.current?.click()}
                        className="p-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10px] cursor-pointer transition-colors border border-slate-200/60"
                      >
                        Pilih File
                      </button>
                    </div>

                    <p className="text-[9px] text-slate-400 font-medium">
                      {uploadStatus ? (
                        <span className="text-orange-600 font-bold">
                          {uploadStatus}
                        </span>
                      ) : (
                        <span>
                          Format JPG/PNG (Transparansi didukung). Maks 2MB.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-orange-50/80 text-orange-800 text-[11px] font-medium rounded-2xl border border-orange-100">
                * Keuntungan per pcs:{" "}
                <strong>
                  Rp {Math.max(0, price - costPrice).toLocaleString("id-ID")}
                </strong>
                . Batas minimum pengaman stok berguna agar notifikasi peringatan
                berbunyi otomatis.
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer transition-colors border border-slate-200/60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-3 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-xs cursor-pointer transition-colors shadow-xs"
                >
                  {editingProduct ? "Simpan Perubahan" : "Tambahkan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
