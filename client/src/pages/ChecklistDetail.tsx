import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, Camera, CheckCircle2, AlertCircle, RotateCcw, Clock, ArrowRight, ImageUp } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { IndustrialHeader } from "@/components/IndustrialHeader";

// Retail-oriented barcode formats.
// Without this, html5-qrcode defaults to QR_CODE-only and silently
// rejects every 1D barcode (EAN-13, CODE-128, etc.) — which is what
// physical product packaging uses.
const SUPPORTED_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
];

export default function ChecklistDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/checklist/:id");
  const checklistId = params?.id ? parseInt(params.id) : null;

  const { data: checklist, isLoading: checklistLoading, refetch: refetchChecklist } = trpc.checklist.getById.useQuery(
    { checklistId: checklistId! },
    { enabled: !!checklistId && !!user }
  );
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = trpc.checklist.getItems.useQuery(
    { checklistId: checklistId! },
    { enabled: !!checklistId && !!user }
  );
  const { data: scanRecords, refetch: refetchScanRecords } = trpc.checklist.getScanRecords.useQuery(
    { checklistId: checklistId! },
    { enabled: !!checklistId && !!user }
  );

  const scanMutation = trpc.checklist.scan.useMutation();
  const resetMutation = trpc.checklist.reset.useMutation();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [decodingFile, setDecodingFile] = useState(false);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleScanRef = useRef<((barcode: string) => Promise<void>) | null>(null);

  // Camera lifecycle — preserved logic, only the visual layer changes
  useEffect(() => {
    if (!cameraActive) {
      if (qrCodeRef.current) {
        const s = qrCodeRef.current;
        qrCodeRef.current = null;
        s.stop().catch((err) => {
          console.warn("[Camera] stop() warning:", err?.message ?? err);
        });
      }
      return;
    }

    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    (async () => {
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;
      const target = document.getElementById("qr-reader");
      if (!target) {
        toast.error("无法访问摄像头或初始化扫描器");
        setCameraActive(false);
        return;
      }
      try {
        scanner = new Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            // No `qrbox` — let the scanner search the whole frame so it can
            // find 1D barcodes that may be off-center, tilted, or far away.
            formatsToSupport: SUPPORTED_FORMATS,
          },
          (decodedText) => handleScanRef.current?.(decodedText),
          () => {}
        );
        if (cancelled) {
          await scanner.stop().catch(() => {});
          return;
        }
        qrCodeRef.current = scanner;
      } catch (error) {
        console.error("Camera start failed:", error);
        toast.error("无法访问摄像头或初始化扫描器");
        setCameraActive(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cameraActive]);

  // Cleanup the file-scanner Html5Qrcode instance on unmount
  useEffect(() => {
    return () => {
      if (fileScannerRef.current) {
        fileScannerRef.current.clear().catch(() => {});
        fileScannerRef.current = null;
      }
    };
  }, []);

  // File-capture fallback: works on HTTP (uses native camera intent, not getUserMedia)
  // and on HTTPS alike. Best-effort for non-HTTPS mobile users.
  //
  // Strategy: try the native BarcodeDetector API first (Chrome 83+, Safari 16.4+,
  // Edge) — it ships with the browser, is optimized for 1D barcodes, and
  // handles real-world photos much better than the JS fallback. Fall back to
  // html5-qrcode on older browsers.
  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset the input so the same file can be re-picked
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    // Stop the live camera first to free the device and avoid conflicts
    if (cameraActive) {
      setCameraActive(false);
      await new Promise((r) => setTimeout(r, 120));
    }

    setDecodingFile(true);
    try {
      let decoded: string | null = null;

      // --- Primary: native BarcodeDetector ---
      const BD = (window as any).BarcodeDetector;
      if (typeof BD === "function") {
        try {
          const detector = new BD({
            formats: [
              "ean_13", "ean_8", "upc_a", "upc_e", "upc_ean_extension",
              "code_128", "code_39", "code_93", "codabar", "itf",
              "qr_code", "data_matrix", "pdf417", "aztec",
            ],
          });
          const bitmap = await createImageBitmap(file);
          const results = await detector.detect(bitmap);
          if (results.length > 0) {
            decoded = results[0].rawValue;
          }
        } catch (e) {
          // BarcodeDetector not happy — try fallback
          console.warn("[PhotoScan] BarcodeDetector failed, falling back:", e);
        }
      }

      // --- Fallback: html5-qrcode (older browsers without BarcodeDetector) ---
      if (!decoded) {
        // Clean up any prior file-scanner instance before creating a new one
        if (fileScannerRef.current) {
          try { await fileScannerRef.current.clear(); } catch { /* ignore */ }
          fileScannerRef.current = null;
        }
        const scanner = new Html5Qrcode("qr-file-scanner", { verbose: false });
        fileScannerRef.current = scanner;
        decoded = await scanner.scanFile(file, false);
      }

      if (decoded) {
        await handleScanRef.current?.(decoded);
      } else {
        toast.error("未能识别图片中的条码", {
          description: "请确保条码平整、光线均匀、占据画面 1/3 以上",
        });
      }
    } catch (error) {
      console.warn("[PhotoScan] failed:", error);
      toast.error("未能识别图片中的条码", {
        description: "请确保条码平整、光线均匀、占据画面 1/3 以上",
      });
    } finally {
      setDecodingFile(false);
    }
  };

  const handleScan = async (barcode: string, methodOverride?: "camera" | "manual") => {
    if (!barcode.trim() || !checklistId) return;
    setScanning(true);
    try {
      const result = await scanMutation.mutateAsync({
        checklistId,
        barcode: barcode.trim(),
        scanMethod: methodOverride ?? (cameraActive ? "camera" : "manual"),
      });
      if (result.success) {
        toast.success(
          `✓ ${result.item.productName} (${result.newQuantity}/${result.item.targetQuantity})`
        );
        if (result.isCompleted) {
          toast.success(`完成！${result.item.productName} 已全部核对`);
        }
      } else {
        toast.error("扫描失败");
      }
      setBarcodeInput("");
      refetchItems();
      refetchChecklist();
      refetchScanRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "扫描失败");
    } finally {
      setScanning(false);
    }
  };
  handleScanRef.current = handleScan;

  const handleReset = async () => {
    if (!confirm("确定要重置这个清单吗？所有扫描记录将被清除。")) return;
    try {
      await resetMutation.mutateAsync({ checklistId: checklistId! });
      toast.success("清单已重置");
      refetchItems();
      refetchChecklist();
      refetchScanRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    }
  };

  if (authLoading || checklistLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!checklist || !items) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="border border-foreground p-10 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-accent mx-auto mb-4" />
          <p className="text-foreground/75 mb-6">清单不存在或无权限访问</p>
          <Button onClick={() => navigate("/checklists")} className="btn-ink">
            返回清单列表
          </Button>
        </div>
      </div>
    );
  }

  const progress =
    checklist.totalItems > 0
      ? Math.round((checklist.completedItems / checklist.totalItems) * 100)
      : 0;
  const completedItems = items.filter((item) => item.isCompleted).length;
  const pendingItems = items.filter((item) => !item.isCompleted);
  const done = progress === 100;

  return (
    <div className="min-h-screen page-in">
      <IndustrialHeader sectionLabel={`LIST · ${checklist.id}`} />

      <main className="container">
        {/* === Hero === */}
        <section className="pt-10 pb-8 grid grid-cols-12 gap-6">
          <div
            className="col-span-12 lg:col-span-8 stagger-in"
            style={{ ["--i" as any]: 0 }}
          >
            <button
              onClick={() => navigate("/checklists")}
              className="btn-ghost mb-4 text-xs"
            >
              ← 返回清单列表
            </button>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
              ■ CHECKLIST · {checklist.fileName}
            </div>
            <h1 className="font-display text-[clamp(2.25rem,6.5vw,5rem)] leading-[0.95] tracking-tight">
              {checklist.name}
            </h1>
          </div>
          <div
            className="col-span-12 lg:col-span-4 flex flex-col items-start lg:items-end justify-end stagger-in"
            style={{ ["--i" as any]: 1 }}
          >
            {done ? (
              <div className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-verify">
                <CheckCircle2 className="w-4 h-4" />
                ALL ITEMS VERIFIED
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-accent">
                <span className="pulse-dot" />
                SCANNING IN PROGRESS
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-foreground">
          <div className="grid grid-cols-12 gap-0">
            {/* === LEFT — Scan panel === */}
            <aside className="col-span-12 lg:col-span-5 p-6 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-foreground space-y-8">
              {/* Progress block */}
              <div className="stagger-in" style={{ ["--i" as any]: 2 }}>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                    ■ PROGRESS
                  </div>
                  <div className="font-mono text-xs tracking-widest">
                    {completedItems} / {checklist.totalItems}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <div className="num-display text-[clamp(4rem,12vw,7rem)] tabular-nums">
                    {progress}
                    <span className="text-2xl sm:text-3xl text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="mt-4 h-[3px] w-full bg-foreground/15 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 progress-fill"
                    style={{
                      width: `${progress}%`,
                      background: done ? "#1b7a3e" : "#e63946",
                    }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="border border-foreground/30 p-3">
                    <div className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">
                      Completed
                    </div>
                    <div className="text-verify text-lg tabular-nums">
                      {completedItems}
                    </div>
                  </div>
                  <div className="border border-foreground/30 p-3">
                    <div className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">
                      Pending
                    </div>
                    <div className="text-accent text-lg tabular-nums">
                      {pendingItems.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera toggle + Photo capture fallback */}
              <div className="stagger-in" style={{ ["--i" as any]: 3 }}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCameraActive((prev) => !prev)}
                    disabled={decodingFile}
                    className={`h-12 flex items-center justify-center gap-2 font-medium tracking-wide border transition-colors disabled:opacity-30 ${
                      cameraActive
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-foreground text-background border-foreground hover:bg-accent hover:border-accent"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    {cameraActive ? "关闭" : "实时扫码"}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={scanning || decodingFile || cameraActive}
                    title={cameraActive ? "请先关闭实时扫码" : "拍摄或选择图片识别条码（HTTP 下也能用）"}
                    className="h-12 flex items-center justify-center gap-2 font-medium tracking-wide border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background disabled:opacity-30"
                  >
                    {decodingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageUp className="w-4 h-4" />
                    )}
                    拍照识别
                  </button>
                </div>
                {cameraActive && (
                  <div className="mt-3 border border-foreground overflow-hidden scan-line">
                    <div id="qr-reader" className="w-full" />
                  </div>
                )}
                {/* Hidden inputs for the photo-capture fallback (HTTP-friendly) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  // @ts-expect-error — non-standard but supported by all major mobile browsers
                  capture="environment"
                  onChange={handleFileSelected}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <div
                  id="qr-file-scanner"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    top: "0",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Manual input */}
              <div className="stagger-in" style={{ ["--i" as any]: 4 }}>
                <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
                  ■ MANUAL ENTRY
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="扫描或输入条形码"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleScan(barcodeInput);
                    }}
                    disabled={scanning}
                    className="flex-1 h-12 border border-foreground bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-accent font-mono"
                  />
                  <button
                    onClick={() => handleScan(barcodeInput)}
                    disabled={scanning || !barcodeInput.trim()}
                    className="h-12 px-5 bg-foreground text-background border border-foreground hover:bg-accent hover:border-accent disabled:opacity-30 font-medium tracking-wide"
                  >
                    {scanning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "确认"
                    )}
                  </button>
                </div>
              </div>

              {/* Action row */}
              <div className="grid grid-cols-2 gap-2 stagger-in" style={{ ["--i" as any]: 5 }}>
                <button
                  onClick={() => setShowScanHistory((s) => !s)}
                  className="btn-outline h-11 text-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {showScanHistory ? "隐藏" : "查看"}历史
                </button>
                <button
                  onClick={handleReset}
                  className="btn-outline h-11 text-xs hover:bg-accent hover:border-accent"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重置清单
                </button>
              </div>
            </aside>

            {/* === RIGHT — Items === */}
            <div className="col-span-12 lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-8">
              {/* Scan history */}
              {showScanHistory && scanRecords && scanRecords.length > 0 && (
                <div className="border border-foreground p-5 stagger-in" style={{ ["--i" as any]: 2 }}>
                  <div className="flex items-baseline justify-between mb-4">
                    <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                      ■ SCAN LOG
                    </div>
                    <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
                      {scanRecords.length} ENTRIES
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {[...scanRecords].reverse().map((record, idx) => (
                      <div
                        key={record.id}
                        className="grid grid-cols-12 gap-2 text-xs py-1.5 border-b border-foreground/10"
                      >
                        <span className="col-span-1 font-mono text-muted-foreground">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="col-span-6 font-mono truncate">{record.barcode}</span>
                        <span className="col-span-3 font-mono text-muted-foreground">
                          {record.scanMethod === "camera" ? "CAM" : "MAN"}
                        </span>
                        <span className="col-span-2 font-mono text-muted-foreground text-right">
                          {new Date(record.createdAt).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedItems > 0 && (
                <section className="stagger-in" style={{ ["--i" as any]: 3 }}>
                  <div className="flex items-baseline justify-between mb-4 border-b border-foreground pb-2">
                    <h3 className="font-display text-2xl tracking-tight">
                      <span className="font-mono text-xs text-muted-foreground tracking-widest mr-2">
                        ✓
                      </span>
                      已完成
                    </h3>
                    <span className="font-mono text-xs tracking-widest text-verify">
                      {completedItems}
                    </span>
                  </div>
                  <ul className="border-t border-foreground/15">
                    {items
                      .filter((item) => item.isCompleted)
                      .map((item, i) => (
                        <li
                          key={item.id}
                          className="grid grid-cols-12 gap-3 py-3 border-b border-foreground/10"
                        >
                          <span className="col-span-1 font-mono text-[10px] text-muted-foreground pt-1">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="col-span-7">
                            <div className="font-medium leading-tight line-through opacity-60">
                              {item.productName}
                            </div>
                            <div className="font-mono text-[10px] tracking-wider text-muted-foreground mt-1">
                              {item.barcode}
                            </div>
                          </div>
                          <div className="col-span-4 text-right">
                            <div className="font-display tabular-nums text-2xl leading-none text-verify">
                              {item.verifiedQuantity}
                              <span className="text-base text-muted-foreground">
                                /{item.targetQuantity}
                              </span>
                            </div>
                            <div className="font-mono text-[9px] tracking-widest text-verify mt-1">
                              VERIFIED
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              )}

              {/* Pending */}
              {pendingItems.length > 0 && (
                <section className="stagger-in" style={{ ["--i" as any]: 4 }}>
                  <div className="flex items-baseline justify-between mb-4 border-b border-foreground pb-2">
                    <h3 className="font-display text-2xl tracking-tight">
                      <span className="font-mono text-xs text-muted-foreground tracking-widest mr-2">
                        ◌
                      </span>
                      待核对
                    </h3>
                    <span className="font-mono text-xs tracking-widest text-accent">
                      {pendingItems.length}
                    </span>
                  </div>
                  <ul className="border-t border-foreground/15">
                    {pendingItems.map((item, i) => {
                      const itemProgress =
                        item.targetQuantity > 0
                          ? (item.verifiedQuantity / item.targetQuantity) * 100
                          : 0;
                      const itemDone = itemProgress >= 100;
                      return (
                        <li
                          key={item.id}
                          className="grid grid-cols-12 gap-3 py-4 border-b border-foreground/10"
                        >
                          <span className="col-span-1 font-mono text-[10px] text-muted-foreground pt-1">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="col-span-7">
                            <div className="font-medium leading-tight">
                              {item.productName}
                            </div>
                            <div className="font-mono text-[10px] tracking-wider text-muted-foreground mt-1">
                              {item.barcode}
                            </div>
                            <div className="mt-2 h-[2px] bg-foreground/10 relative overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 progress-fill"
                                style={{
                                  width: `${itemProgress}%`,
                                  background: itemDone ? "#1b7a3e" : "#e63946",
                                }}
                              />
                            </div>
                          </div>
                          <div className="col-span-4 text-right">
                            <div className="font-display tabular-nums text-2xl leading-none">
                              {item.verifiedQuantity}
                              <span className="text-base text-muted-foreground">
                                /{item.targetQuantity}
                              </span>
                            </div>
                            <div className="font-mono text-[9px] tracking-widest text-muted-foreground mt-1">
                              {Math.round(itemProgress)}%
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {completedItems === 0 && pendingItems.length === 0 && (
                <div className="text-center py-16">
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
                    ■ EMPTY
                  </div>
                  <p className="font-display text-2xl">清单中无商品。</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
