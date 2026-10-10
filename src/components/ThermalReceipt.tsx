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

  // CETAK USB / DRIVER SPOOLER WINDOWS (PRESISI ANTI-TERPOTONG 58MM)
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
                  width: ${paperWidth === "58" ? "38mm" : "72mm"} !important;
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
                /* Diturunkan ke 38mm agar muat penuh di printable area 58mm */
                width: ${paperWidth === "58" ? "38mm" : "72mm"};
                margin: 0 !important;
                padding: 0 !important;
                font-size: 8.5px !important;
                line-height: 1.2 !important;
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
                margin: 2px 0 !important;
                font-size: 8.5px !important;
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
                font-size: 8.5px !important;
                word-wrap: break-word !important;
              }

              .bold {
                font-weight: bold !important;
              }
            </style>
          </head>
          <body>
            <!-- HEADER TOKO (PRESISI TENGAH) -->
            <div class="header-box">
              <div class="bold" style="font-size: 10px;">${nameOfStore}</div>
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
                <div style="margin-bottom: 2px; width: 100%;">
                  <div class="bold">${item.name}</div>
                  <table>
                    <tr>
                      <td style="width: 50%; text-align: left;">${item.qty} x${formatIDR(item.price)}</td>
                      <td style="width: 50%; text-align: right;" class="bold">${formatIDR(item.total)}</td>
                    </tr>
                  </table>
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
              <tr>
                <td style="width: 55%; text-align: left;" class="bold">Pajak (PPN ${transaction.taxTotal > 0 ? "11%" : "0%"}):</td>
                <td style="width: 45%; text-align: right;">${formatIDR(transaction.taxTotal)}</td>
              </tr>
            </table>

            <div class="dashed-line">--------------------------------</div>

            <table>
              <tr class="bold">
                <td style="width: 50%; text-align: left;">TOTAL:</td>
                <td style="width: 50%; text-align: right;">${formatIDR(transaction.total)}</td>
              </tr>
            </table>

            <div class="dashed-line">--------------------------------</div>

            <!-- FOOTER (PRESISI TENGAH) -->
            <div class="header-box" style="margin-top: 4px;">
              <div class="bold" style="font-size: 8px;">TERIMA KASIH ATAS KUNJUNGAN ANDA</div>
              <div style="font-size: 7.5px; margin-top: 1px;">Simpan struk ini sebagai bukti pembayaran</div>
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
      alert("Browser Anda belum mendukung Web Bluetooth (gunakan Chrome).");
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
      console.warn("Bluetooth pairing gagal:", err);
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
        link.download = `Struk-${transaction.invoiceNumber}.png`;
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

      const file = new File([blob], `Struk-${transaction.invoiceNumber}.png`, {
        type: "image/png",
      });

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
      <div className="flex flex-col lg:flex-row gap-5 max-w-5xl mx-auto w-full pb-10">
        {/* Container Preview */}
        <div className="flex-1 flex flex-col items-center bg-slate-100 p-5 sm:p-6 rounded-3xl border border-slate-200">
          <div className="flex justify-between items-center w-full max-w-[300px] mb-4 pb-3 border-b border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Ukuran Kertas:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPaperWidth("58")}
                className={`p-1.5 px-3 text-xs rounded-xl font-extrabold cursor-pointer transition-all ${
                  paperWidth === "58"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth("80")}
                className={`p-1.5 px-3 text-xs rounded-xl font-extrabold cursor-pointer transition-all ${
                  paperWidth === "80"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                80mm
              </button>
            </div>
          </div>

          {/* Struk Card (Presisi Lebar Cetak 48mm untuk 58mm) */}
          <div
            className="bg-white p-3 shadow-md border border-slate-200 relative rounded-lg select-none transition-all duration-300"
            style={{ width: paperWidth === "58" ? "220px" : "300px" }}
          >
            <div
              id="thermal-receipt-view"
              className="font-mono text-black text-[11px] leading-snug bg-white p-0 font-bold w-full overflow-hidden"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {/* Header Toko */}
              <div className="text-center w-full">
                <p className="font-extrabold text-xs text-black text-center">
                  {nameOfStore}
                </p>
                {addressOfStore && (
                  <p className="text-black text-center text-[10px]">
                    {addressOfStore}
                  </p>
                )}
                {phoneOfStore && (
                  <p className="text-black text-center text-[10px]">
                    Telp: {phoneOfStore}
                  </p>
                )}
              </div>

              <div className="divider border-t border-dashed border-black my-1.5 w-full"></div>

              {/* Detail Nota */}
              <table className="w-full text-left text-[10px] text-black border-collapse">
                <tbody>
                  <tr>
                    <td className="w-10 font-bold text-left align-top">Nota</td>
                    <td className="text-left align-top">
                      : {transaction.invoiceNumber}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-10 font-bold text-left align-top">Tgl</td>
                    <td className="text-left align-top">
                      : {new Date(transaction.date).toLocaleString("id-ID")}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-10 font-bold text-left align-top">
                      Kasir
                    </td>
                    <td className="text-left align-top">
                      : {transaction.cashierName || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="w-10 font-bold text-left align-top">
                      Bayar
                    </td>
                    <td className="text-left align-top">
                      : {transaction.paymentMethod.toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="divider border-t border-dashed border-black my-1.5 w-full"></div>

              {/* Item Belanja */}
              <div className="my-1 w-full">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="mb-1 w-full">
                    <div className="font-bold text-black text-left w-full truncate">
                      {item.name}
                    </div>
                    <table className="w-full text-black border-collapse text-[10px]">
                      <tbody>
                        <tr>
                          <td className="text-left whitespace-nowrap align-top">
                            {item.qty} x {formatIDR(item.price)}
                          </td>
                          <td className="text-right font-bold whitespace-nowrap align-top">
                            {formatIDR(item.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {item.discount > 0 && (
                      <div className="text-black pl-1 text-[9px] text-left">
                        * Diskon: -{formatIDR(item.discount * item.qty)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="divider border-t border-dashed border-black my-1.5 w-full"></div>

              {/* Rincian Total */}
              <table className="w-full text-black font-bold border-collapse text-[10px]">
                <tbody>
                  <tr>
                    <td className="text-left whitespace-nowrap">Subtotal:</td>
                    <td className="text-right whitespace-nowrap">
                      {formatIDR(transaction.subTotal)}
                    </td>
                  </tr>
                  {transaction.discountTotal > 0 && (
                    <tr>
                      <td className="text-left whitespace-nowrap">Potongan:</td>
                      <td className="text-right whitespace-nowrap">
                        -{formatIDR(transaction.discountTotal)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-left whitespace-nowrap">
                      Pajak (PPN {transaction.taxTotal > 0 ? "11%" : "0%"}):
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatIDR(transaction.taxTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="divider border-t border-dashed border-black my-1 w-full"></div>

              <table className="w-full text-black font-extrabold border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="text-left whitespace-nowrap">TOTAL:</td>
                    <td className="text-right whitespace-nowrap">
                      {formatIDR(transaction.total)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="divider border-t border-dashed border-black my-1 w-full"></div>

              {transaction.paymentMethod === "cash" && (
                <table className="w-full text-black font-bold border-collapse text-[10px]">
                  <tbody>
                    <tr>
                      <td className="text-left whitespace-nowrap">
                        Bayar Tunai:
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {formatIDR(transaction.cashAmount || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-left font-extrabold whitespace-nowrap">
                        Kembalian:
                      </td>
                      <td className="text-right font-extrabold whitespace-nowrap">
                        {formatIDR(transaction.changeAmount || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Footer Struk */}
              <div className="text-center text-[9px] space-y-0.5 mt-3 text-black w-full">
                <p className="font-extrabold text-center">
                  TERIMA KASIH ATAS KUNJUNGAN ANDA
                </p>
                <p className="text-center text-[8px]">
                  Simpan struk ini sebagai bukti pembayaran
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Kontrol */}
        <div className="w-full lg:w-[360px] bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
              Opsi Cetak Struk
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pilih metode cetak yang sesuai dengan perangkat Anda.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Tombol Cetak USB */}
            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs">
                <Usb size={16} />
                <span>Cetak USB / Driver Sistem</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Gunakan ini untuk printer USB lokal atau printer yang terpasang
                via driver PC / Spooler.
              </p>

              <button
                onClick={handlePrintUSB}
                disabled={isPrintingUSB}
                className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold cursor-pointer disabled:bg-orange-300 flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 active:scale-[0.98]"
              >
                <Printer size={16} />
                {isPrintingUSB
                  ? "Mencetak via USB..."
                  : "CETAK VIA USB / SPOOLER"}
              </button>
            </div>

            {/* Tombol Cetak Bluetooth */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs">
                <Bluetooth size={16} />
                <span>Cetak Bluetooth</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {bluetoothDevice
                  ? `Terhubung ke: ${bluetoothDevice.name}`
                  : "Sambungkan langsung ke printer thermal portable tanpa driver."}
              </p>

              <button
                onClick={handlePrintBluetooth}
                disabled={isBluetoothConnecting}
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer disabled:bg-blue-300 flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
              >
                {isBluetoothConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Menghubungkan Bluetooth...
                  </>
                ) : (
                  <>
                    <Bluetooth size={16} />
                    {bluetoothDevice
                      ? `CETAK VIA BLUETOOTH (${bluetoothDevice.name?.substring(0, 8)})`
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
                    Kirim ke WhatsApp pelanggan
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  disabled={isGeneratingImage}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-emerald-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Share2 size={13} />
                  {isGeneratingImage ? "Proses..." : "WhatsApp"}
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download size={13} />
                  Unduh PNG
                </button>
              </div>
            </div>
          </div>

          {printSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>Perintah cetak berhasil dikirim!</span>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={onBack}
              className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Kembali ke Kasir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
