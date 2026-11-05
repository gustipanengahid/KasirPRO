import React, { useState } from "react";
import {
  Printer,
  Bluetooth,
  ArrowLeft,
  CheckCircle,
  Share2,
  Download,
  MessageCircle,
  RefreshCw,
  Usb,
} from "lucide-react";
import { toPng } from "html-to-image";
import { Transaction, StoreSettings } from "../types";

interface ThermalReceiptProps {
  transaction: Transaction;
  onBack: () => void;
  storeSettings?: StoreSettings;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export default function ThermalReceipt({
  transaction,
  onBack,
  storeSettings,
  storeName,
  storeAddress,
  storePhone,
}: ThermalReceiptProps) {
  const nameOfStore = storeSettings?.name || storeName || "";
  const addressOfStore = storeSettings?.address || storeAddress || "";
  const phoneOfStore = storeSettings?.phone || storePhone || "";

  const [isPrintingUSB, setIsPrintingUSB] = useState(false);
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("58");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const formatIDR = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  // CETAK USB / DRIVER SPOOLER WINDOWS (PRESISI ANTI-TERPOTONG)
  const handlePrintUSB = () => {
    setIsPrintingUSB(true);

    let printFrame = document.getElementById(
      "ppob-print-frame",
    ) as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "ppob-print-frame";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0px";
      printFrame.style.height = "0px";
      printFrame.style.border = "none";
      document.body.appendChild(printFrame);
    }

    const frameDoc =
      printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Struk - ${transaction.invoiceNumber}</title>
            <style>
              @page {
                size: ${paperWidth === "58" ? "58mm auto" : "80mm auto"};
                margin: 0mm !important;
              }

              @media print {
                html, body {
                  width: ${paperWidth === "58" ? "48mm" : "72mm"} !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #fff !important;
                }
                header, footer, nav { display: none !important; }
              }

              * {
                box-sizing: border-box !important;
                color: #000000 !important;
                font-family: 'Courier New', Courier, monospace !important;
              }

              body {
                width: ${paperWidth === "58" ? "48mm" : "72mm"};
                margin: 0 !important;
                padding: 4px !important;
                font-size: 9px !important;
                line-height: 1.25 !important;
                font-weight: 600 !important;
              }

              .header-box {
                width: 100% !important;
                text-align: center !important;
                margin: 0 auto !important;
              }

              .text-center { text-align: center !important; }
              .text-right { text-align: right !important; }
              .text-left { text-align: left !important; }

              .dashed-line {
                overflow: hidden !important;
                white-space: nowrap !important;
                letter-spacing: -1px !important;
                margin: 3px 0 !important;
                font-size: 9px !important;
                text-align: center !important;
                width: 100% !important;
              }

              table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
              }

              td {
                padding: 0.5px 0 !important;
                vertical-align: top !important;
                font-size: 9px !important;
                word-wrap: break-word !important;
              }

              .bold {
                font-weight: bold !important;
              }
            </style>
          </head>
          <body>
            <!-- HEADER TOKO -->
            <div class="header-box">
              <div class="bold" style="font-size: 11px;">${nameOfStore}</div>
              ${addressOfStore ? `<div>${addressOfStore}</div>` : ""}
              ${phoneOfStore ? `<div>Telp: ${phoneOfStore}</div>` : ""}
            </div>

            <div class="dashed-line">--------------------------------</div>

            <!-- DETAIL NOTA -->
            <table>
              <tr>
                <td style="width: 28%;" class="bold">Nota</td>
                <td style="width: 5%;">:</td>
                <td style="width: 67%;">${transaction.invoiceNumber}</td>
              </tr>
              <tr>
                <td class="bold">Tgl</td>
                <td>:</td>
                <td>${new Date(transaction.date).toLocaleString("id-ID")}</td>
              </tr>
              <tr>
                <td class="bold">Kasir</td>
                <td>:</td>
                <td>${transaction.cashierName || "-"}</td>
              </tr>
              <tr>
                <td class="bold">Bayar</td>
                <td>:</td>
                <td>${transaction.paymentMethod.toUpperCase()}</td>
              </tr>
            </table>

            <div class="dashed-line">--------------------------------</div>

            <!-- ITEM BELANJA -->
            ${transaction.items
              .map(
                (item) => `
                <div style="margin-bottom: 3px; width: 100%;">
                  <div class="bold">${item.name}</div>
                  <table>
                    <tr>
                      <td style="width: 50%; text-align: left;">${item.qty} x ${formatIDR(item.price)}</td>
                      <td style="width: 50%; text-align: right;" class="bold">${formatIDR(item.total)}</td>
                    </tr>
                  </table>
                  ${item.discount > 0 ? `<div style="font-size: 8px;">Diskon: -${formatIDR(item.discount * item.qty)}</div>` : ""}
                </div>
              `,
              )
              .join("")}

            <div class="dashed-line">--------------------------------</div>

            <!-- RINCIAN TOTAL -->
            <table>
              <tr>
                <td style="width: 55%; text-align: left;" class="bold">Subtotal:</td>
                <td style="width: 45%; text-align: right;">${formatIDR(transaction.subTotal)}</td>
              </tr>
              ${
                transaction.discountTotal > 0
                  ? `
                <tr>
                  <td style="text-align: left;" class="bold">Potongan:</td>
                  <td style="text-align: right;">-${formatIDR(transaction.discountTotal)}</td>
                </tr>
              `
                  : ""
              }
              <tr>
                <td style="text-align: left;" class="bold">Pajak (${transaction.taxTotal > 0 ? "Aktif" : "0%"}):</td>
                <td style="text-align: right;">${formatIDR(transaction.taxTotal)}</td>
              </tr>
            </table>

            <div class="dashed-line">--------------------------------</div>

            <table>
              <tr class="bold">
                <td style="width: 50%; text-align: left; font-size: 10px;">TOTAL:</td>
                <td style="width: 50%; text-align: right; font-size: 10px;">${formatIDR(transaction.total)}</td>
              </tr>
            </table>

            ${
              transaction.paymentMethod === "cash"
                ? `
              <div class="dashed-line">--------------------------------</div>
              <table>
                <tr>
                  <td style="text-align: left;">Tunai:</td>
                  <td style="text-align: right;">${formatIDR(transaction.cashAmount || 0)}</td>
                </tr>
                <tr>
                  <td style="text-align: left;" class="bold">Kembalian:</td>
                  <td style="text-align: right;" class="bold">${formatIDR(transaction.changeAmount || 0)}</td>
                </tr>
              </table>
            `
                : ""
            }

            <div class="dashed-line">--------------------------------</div>

            <!-- FOOTER -->
            <div class="header-box" style="margin-top: 6px;">
              <div class="bold" style="font-size: 8.5px;">TERIMA KASIH ATAS KUNJUNGAN ANDA</div>
              <div style="font-size: 8px; margin-top: 1px;">Simpan struk ini sebagai bukti pembayaran</div>
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setIsPrintingUSB(false);
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }, 250);
    }
  };

  // 2. CETAK BLUETOOTH
  const handlePrintBluetooth = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert(
        "Browser Anda belum mendukung Web Bluetooth (gunakan Google Chrome).",
      );
      return;
    }

    setIsBluetoothConnecting(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        ],
      });

      setBluetoothDevice(device);
      const server = await device.gatt.connect();
      if (server) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Bluetooth pairing gagal:", err);
      }
    } finally {
      setIsBluetoothConnecting(false);
    }
  };

  const generateReceiptImage = async (): Promise<Blob | null> => {
    const node = document.getElementById("thermal-receipt-view");
    if (!node) return null;
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error("Gagal membuat gambar struk:", err);
      return null;
    }
  };

  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    const node = document.getElementById("thermal-receipt-view");
    if (node) {
      try {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          backgroundColor: "#ffffff",
        });
        const link = document.createElement("a");
        link.download = `Struk-${transaction.invoiceNumber.replace(/\//g, "-")}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Gagal mengunduh gambar:", err);
      }
    }
    setIsGeneratingImage(false);
  };

  const handleShareWhatsApp = async () => {
    setIsGeneratingImage(true);
    try {
      const blob = await generateReceiptImage();
      if (!blob) {
        alert("Gagal membuat gambar struk.");
        setIsGeneratingImage(false);
        return;
      }

      const file = new File(
        [blob],
        `Struk-${transaction.invoiceNumber.replace(/\//g, "-")}.png`,
        { type: "image/png" },
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Struk Belanja ${nameOfStore}`,
          text: `Halo, berikut adalah nota digital transaksi ${transaction.invoiceNumber} di ${nameOfStore}. Terima kasih!`,
          files: [file],
        });
      } else {
        handleDownloadImage();
        const waText = encodeURIComponent(
          `Halo, berikut adalah nota digital transaksi *${transaction.invoiceNumber}* dari *${nameOfStore}*.\nTotal: *Rp ${formatIDR(transaction.total)}*\nTerima kasih atas kunjungan Anda!`,
        );
        window.open(`https://wa.me/?text=${waText}`, "_blank");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error saat membagikan:", err);
      }
    }
    setIsGeneratingImage(false);
  };

  return (
    <div className="w-full h-full p-0 relative flex flex-col space-y-4 font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full pb-10 items-start">
        {/* Kolom Kiri: Pratinjau Struk (Diperbesar & Disesuaikan dengan Layar Desktop) */}
        <div className="flex-1 w-full flex flex-col items-center bg-slate-50/80 p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-2xs min-h-[580px] justify-start">
          <div className="flex justify-between items-center w-full max-w-[340px] sm:max-w-[380px] mb-6 pb-4 border-b border-slate-200/60">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Ukuran Kertas Thermal:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPaperWidth("58")}
                className={`p-2 px-4 text-xs rounded-xl font-extrabold cursor-pointer transition-all ${
                  paperWidth === "58"
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                    : "bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50"
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth("80")}
                className={`p-2 px-4 text-xs rounded-xl font-extrabold cursor-pointer transition-all ${
                  paperWidth === "80"
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                    : "bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50"
                }`}
              >
                80mm
              </button>
            </div>
          </div>

          {/* Kartu Pratinjau Struk (Diperbesar Secara Visual) */}
          <div
            className="bg-white p-6 sm:p-7 shadow-xl border border-slate-200/70 relative rounded-2xl select-none transition-all duration-300 my-auto"
            style={{ width: paperWidth === "58" ? "340px" : "420px" }}
          >
            <div
              id="thermal-receipt-view"
              className="font-mono text-black text-xs leading-relaxed bg-white p-0 font-bold w-full overflow-hidden"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {/* Header Toko */}
              <div className="text-center w-full space-y-0.5">
                <p className="font-extrabold text-sm text-black text-center uppercase tracking-wide">
                  {nameOfStore}
                </p>
                {addressOfStore && (
                  <p className="text-black text-center text-xs font-normal">
                    {addressOfStore}
                  </p>
                )}
                {phoneOfStore && (
                  <p className="text-black text-center text-xs font-normal">
                    Telp: {phoneOfStore}
                  </p>
                )}
              </div>

              <div className="border-t border-dashed border-black my-3 w-full"></div>

              {/* Detail Nota */}
              <table className="w-full text-left text-xs text-black border-collapse">
                <tbody>
                  <tr>
                    <td className="w-12 font-bold text-left align-top">Nota</td>
                    <td className="text-left align-top">
                      : {transaction.invoiceNumber}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-12 font-bold text-left align-top">Tgl</td>
                    <td className="text-left align-top">
                      : {new Date(transaction.date).toLocaleString("id-ID")}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-12 font-bold text-left align-top">
                      Kasir
                    </td>
                    <td className="text-left align-top">
                      : {transaction.cashierName || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-12 font-bold text-left align-top">
                      Bayar
                    </td>
                    <td className="text-left align-top">
                      : {transaction.paymentMethod.toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-dashed border-black my-3 w-full"></div>

              {/* Item Belanja */}
              <div className="my-1.5 w-full space-y-2">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="w-full">
                    <div className="font-bold text-black text-left w-full truncate">
                      {item.name}
                    </div>
                    <table className="w-full text-black border-collapse text-xs mt-0.5">
                      <tbody>
                        <tr>
                          <td className="text-left whitespace-nowrap align-top font-normal">
                            {item.qty} x {formatIDR(item.price)}
                          </td>
                          <td className="text-right font-bold whitespace-nowrap align-top">
                            {formatIDR(item.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {item.discount > 0 && (
                      <div className="text-black pl-1 text-[11px] font-normal text-left">
                        * Diskon: -{formatIDR(item.discount * item.qty)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-black my-3 w-full"></div>

              {/* Rincian Total */}
              <table className="w-full text-black border-collapse text-xs space-y-1">
                <tbody>
                  <tr>
                    <td className="text-left whitespace-nowrap font-normal">
                      Subtotal:
                    </td>
                    <td className="text-right whitespace-nowrap font-normal">
                      {formatIDR(transaction.subTotal)}
                    </td>
                  </tr>
                  {transaction.discountTotal > 0 && (
                    <tr>
                      <td className="text-left whitespace-nowrap font-normal">
                        Potongan:
                      </td>
                      <td className="text-right whitespace-nowrap font-normal text-emerald-700">
                        -{formatIDR(transaction.discountTotal)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-left whitespace-nowrap font-normal">
                      Pajak ({transaction.taxTotal > 0 ? "Aktif" : "0%"}):
                    </td>
                    <td className="text-right whitespace-nowrap font-normal">
                      {formatIDR(transaction.taxTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-dashed border-black my-3 w-full"></div>

              <table className="w-full text-black font-extrabold border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="text-left whitespace-nowrap">TOTAL:</td>
                    <td className="text-right whitespace-nowrap text-orange-600">
                      Rp {formatIDR(transaction.total)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {transaction.paymentMethod === "cash" && (
                <>
                  <div className="border-t border-dashed border-black my-3 w-full"></div>
                  <table className="w-full text-black border-collapse text-xs">
                    <tbody>
                      <tr>
                        <td className="text-left whitespace-nowrap font-normal">
                          Tunai:
                        </td>
                        <td className="text-right whitespace-nowrap font-normal">
                          {formatIDR(transaction.cashAmount || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-left font-bold whitespace-nowrap">
                          Kembalian:
                        </td>
                        <td className="text-right font-bold whitespace-nowrap">
                          {formatIDR(transaction.changeAmount || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* Footer Struk */}
              <div className="text-center text-xs space-y-1 mt-5 text-black w-full">
                <p className="font-extrabold text-center uppercase tracking-wider">
                  TERIMA KASIH ATAS KUNJUNGAN ANDA
                </p>
                <p className="text-center text-[10px] font-normal text-slate-600">
                  Simpan struk ini sebagai bukti pembayaran resmi
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Panel Kontrol Aksi */}
        <div className="w-full lg:w-[380px] bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs space-y-5 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
              Opsi Cetak Struk
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Pilih metode cetak atau bagikan nota digital langsung ke
              pelanggan.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Tombol Cetak USB */}
            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100/60 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs">
                <Usb size={16} />
                <span>Cetak USB / Driver Sistem</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Gunakan ini untuk printer USB lokal atau printer thermal PC /
                Spooler.
              </p>

              <button
                onClick={handlePrintUSB}
                disabled={isPrintingUSB}
                className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold cursor-pointer disabled:bg-orange-300 flex items-center justify-center gap-2 transition-all shadow-sm shadow-orange-500/20 active:scale-[0.99]"
              >
                <Printer size={16} />
                {isPrintingUSB ? "Mencetak..." : "CETAK VIA USB / SPOOLER"}
              </button>
            </div>

            {/* Tombol Cetak Bluetooth */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100/60 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs">
                <Bluetooth size={16} />
                <span>Cetak Bluetooth</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {bluetoothDevice
                  ? `Terhubung ke: ${bluetoothDevice.name}`
                  : "Sambungkan langsung ke printer thermal portable via Bluetooth."}
              </p>

              <button
                onClick={handlePrintBluetooth}
                disabled={isBluetoothConnecting}
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer disabled:bg-blue-300 flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-500/20 active:scale-[0.99]"
              >
                {isBluetoothConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Menghubungkan...
                  </>
                ) : (
                  <>
                    <Bluetooth size={16} />
                    {bluetoothDevice
                      ? `CETAK BLUETOOTH (${bluetoothDevice.name?.substring(0, 10)})`
                      : "CETAK VIA BLUETOOTH"}
                  </>
                )}
              </button>
            </div>

            {/* Bagikan Nota WhatsApp / Gambar */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <MessageCircle size={15} />
                </div>
                <div>
                  <span className="font-extrabold text-emerald-900 text-xs block">
                    Nota Digital
                  </span>
                  <span className="text-[10px] text-emerald-700">
                    Kirim struk gambar via WhatsApp atau unduh PNG
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleShareWhatsApp}
                  disabled={isGeneratingImage}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-emerald-400 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Share2 size={14} />
                  {isGeneratingImage ? "Proses..." : "WhatsApp"}
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Download size={14} />
                  Unduh PNG
                </button>
              </div>
            </div>
          </div>

          {printSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>Perintah cetak berhasil dikirim!</span>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={onBack}
              className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={15} />
              Kembali ke Kasir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
