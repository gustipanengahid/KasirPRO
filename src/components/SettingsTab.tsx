import React, { useState, useEffect } from "react";
import {
  Store,
  MapPin,
  Phone,
  Percent,
  CheckCircle,
  Save,
  SlidersHorizontal,
  PhoneCall,
} from "lucide-react";
import { StoreSettings } from "../types";

interface SettingsTabProps {
  settings: StoreSettings;
  onSaveSettings: (
    newSettings: StoreSettings,
    silent?: boolean,
    persistToServer?: boolean,
  ) => void;
}

export default function SettingsTab({
  settings,
  onSaveSettings,
}: SettingsTabProps) {
  // Safe default initialization to avoid undefined controlled/uncontrolled warnings
  const [name, setName] = useState(settings?.name || "");
  const [address, setAddress] = useState(settings?.address || "");
  const [phone, setPhone] = useState(settings?.phone || "");
  const [isTaxEnabled, setIsTaxEnabled] = useState(!!settings?.isTaxEnabled);
  const [taxPercentage, setTaxPercentage] = useState(
    settings?.taxPercentage ?? 0,
  );
  const [isSaved, setIsSaved] = useState(false);

  // Focus tracking
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  const propagateState = (
    updatedFields: Partial<StoreSettings>,
    persistToServer = false,
  ) => {
    onSaveSettings(
      {
        name: updatedFields.name !== undefined ? updatedFields.name : name,
        address:
          updatedFields.address !== undefined ? updatedFields.address : address,
        phone: updatedFields.phone !== undefined ? updatedFields.phone : phone,
        isTaxEnabled:
          updatedFields.isTaxEnabled !== undefined
            ? updatedFields.isTaxEnabled
            : isTaxEnabled,
        taxPercentage:
          updatedFields.taxPercentage !== undefined
            ? updatedFields.taxPercentage
            : taxPercentage,
      },
      true,
      persistToServer,
    );
  };

  const handleNameChange = (val: string) => {
    setName(val);
    propagateState({ name: val }, false);
  };

  const handleNameBlur = () => {
    setIsNameFocused(false);
    propagateState({ name }, true);
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    propagateState({ address: val }, false);
  };

  const handleAddressBlur = () => {
    setIsAddressFocused(false);
    propagateState({ address }, true);
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    propagateState({ phone: val }, false);
  };

  const handlePhoneBlur = () => {
    setIsPhoneFocused(false);
    propagateState({ phone }, true);
  };

  const handleTaxToggleChange = (checked: boolean) => {
    setIsTaxEnabled(checked);
    propagateState({ isTaxEnabled: checked }, true);
  };

  const handleTaxPercentageChange = (val: number) => {
    setTaxPercentage(val);
    propagateState({ taxPercentage: val }, true);
  };

  useEffect(() => {
    if (!isNameFocused && settings?.name !== undefined) setName(settings.name);
  }, [settings?.name]);

  useEffect(() => {
    if (!isAddressFocused && settings?.address !== undefined)
      setAddress(settings.address);
  }, [settings?.address]);

  useEffect(() => {
    if (!isPhoneFocused && settings?.phone !== undefined)
      setPhone(settings.phone);
  }, [settings?.phone]);

  useEffect(() => {
    if (settings?.isTaxEnabled !== undefined)
      setIsTaxEnabled(settings.isTaxEnabled);
    if (settings?.taxPercentage !== undefined)
      setTaxPercentage(settings.taxPercentage);
  }, [settings?.isTaxEnabled, settings?.taxPercentage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(
      {
        name,
        address,
        phone,
        isTaxEnabled,
        taxPercentage,
      },
      false,
      true,
    );
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-16 relative">
      {/* Header Minimalis Tema Putih & Oranye */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200/60 text-[10px] font-black uppercase tracking-wider">
            <SlidersHorizontal size={11} /> Konfigurasi
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-800">
            Pengaturan Toko
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sesuaikan informasi outlet dan tarif pajak
          </p>
        </div>
        <div className="hidden sm:flex p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
          <Store size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PROFIL TOKO */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Profil Toko & Struk
              </h3>
              <p className="text-[10px] text-slate-400">
                Identitas utama pencetakan struk transaksi
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Nama Toko / Outlet
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
                <Store className="text-slate-400 shrink-0" size={16} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={handleNameBlur}
                  placeholder="Contoh: KASIR PINTAR"
                  className="w-full bg-transparent font-bold text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Alamat Outlet
              </label>
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
                <MapPin className="text-slate-400 mt-0.5 shrink-0" size={16} />
                <textarea
                  required
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => setIsAddressFocused(true)}
                  onBlur={handleAddressBlur}
                  placeholder="Alamat lengkap lokasi toko..."
                  rows={2}
                  className="w-full bg-transparent font-medium text-slate-800 focus:outline-hidden resize-none leading-relaxed"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
                <Phone className="text-slate-400 shrink-0" size={16} />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={handlePhoneBlur}
                  placeholder="085842885498"
                  className="w-full bg-transparent font-semibold text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KEBIJAKAN PAJAK */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <Percent size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Pengaturan Pajak (PPN)
              </h3>
              <p className="text-[10px] text-slate-400">
                Kalkulasi tarif pajak otomatis saat checkout
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="font-bold text-slate-800">
                Aktifkan Pajak PPN
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTaxEnabled}
                  onChange={(e) => handleTaxToggleChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {isTaxEnabled && (
              <div className="flex items-center justify-between p-4 bg-orange-50/60 border border-orange-200 rounded-2xl">
                <span className="font-bold text-orange-800">
                  Besaran Tarif PPN (%)
                </span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-300 rounded-xl w-32 focus-within:ring-2 focus-within:ring-orange-500/15">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxPercentage}
                    onChange={(e) =>
                      handleTaxPercentageChange(
                        Math.max(
                          0,
                          Math.min(100, parseFloat(e.target.value) || 0),
                        ),
                      )
                    }
                    className="w-full bg-transparent font-black text-slate-800 focus:outline-hidden text-right"
                  />
                  <span className="font-bold text-slate-400">%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HUBUNGI DEVELOPER */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <PhoneCall size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Bantuan & Dukungan Teknis
              </h3>
              <p className="text-[10px] text-slate-400">
                Butuh bantuan kustomisasi atau kendala aplikasi? Hubungi
                developer
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <PhoneCall size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-800">WhatsApp Developer</p>
                <p className="text-[11px] font-semibold text-emerald-700 tracking-wide">
                  085858581509
                </p>
              </div>
            </div>

            <a
              href="https://wa.me/6285858581509?text=Halo%20Developer,%20saya%20butuh%20bantuan%20terkait%20aplikasi%20KasirPRO."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <PhoneCall size={15} />
              Chat Developer
            </a>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center justify-between bg-white p-4 px-6 rounded-2xl border border-slate-200/80 shadow-xs">
          {isSaved ? (
            <div className="flex items-center gap-2 text-orange-600 text-xs font-bold">
              <CheckCircle size={16} />
              Tersimpan!
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">
              Sinkronisasi data otomatis aktif.
            </span>
          )}

          <button
            type="submit"
            className="p-3 px-6 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Save size={16} />
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
