import { useAuth } from "@/_core/hooks/useAuth";
import { FileUp, AlertCircle, Loader2, Upload as UploadIcon, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { IndustrialHeader } from "@/components/IndustrialHeader";

export default function Upload() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.checklist.uploadAndParse.useMutation();

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx?|numbers)$/i)) {
      toast.error("仅支持 Excel (.xlsx, .xls) 或 Numbers 文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过 10MB");
      return;
    }

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      await uploadMutation.mutateAsync({ fileData: base64, fileName: file.name });
      toast.success("清单上传成功！");
      setTimeout(() => navigate("/checklists"), 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "上传失败";
      console.error("Upload error:", error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="border border-foreground p-10 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-accent mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-3">需要登录</h2>
          <p className="text-sm text-foreground/70 mb-6">请先登录后再上传清单</p>
          <button onClick={() => navigate("/")} className="btn-ink w-full">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const requirements = [
    { code: "R.01", text: "必须包含『条形码』或『条码』列" },
    { code: "R.02", text: "必须包含『数量』或『目标数量』列" },
    { code: "R.03", text: "可选：包含『产品名称』或『产品编码』列" },
    { code: "R.04", text: "文件大小不超过 10MB" },
    { code: "R.05", text: "系统自动识别列名（不区分大小写）" },
  ];

  return (
    <div className="min-h-screen page-in">
      <IndustrialHeader sectionLabel="INGEST / 02" />

      <main className="container">
        {/* === Hero band === */}
        <section className="pt-12 pb-8 sm:pt-16 sm:pb-12 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 stagger-in" style={{ ["--i" as any]: 0 }}>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
              ■ NEW CHECKLIST · INGEST
            </div>
            <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-[0.95] tracking-tight">
              上传
              <br />
              <span className="italic">清单</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-foreground/75 leading-relaxed">
              拖入 Excel 或 Numbers 文件。系统会解析条码、名称与数量，并准备好扫码核对。
            </p>
          </div>
          <div
            className="col-span-12 lg:col-span-4 flex flex-col justify-end items-start lg:items-end gap-2 stagger-in"
            style={{ ["--i" as any]: 1 }}
          >
            <button
              onClick={() => navigate("/checklists")}
              className="btn-ghost"
            >
              ← 返回清单列表
            </button>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-4">
              OPERATOR · {user.name || user.username}
            </div>
          </div>
        </section>

        <section className="border-t border-foreground">
          <div className="grid grid-cols-12 gap-6 py-10">
            {/* === Drop zone === */}
            <div
              className="col-span-12 lg:col-span-8 stagger-in"
              style={{ ["--i" as any]: 2 }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed transition-all p-10 sm:p-16 text-center ${
                  isDragging
                    ? "border-accent bg-accent/5"
                    : "border-foreground/30 hover:border-foreground"
                }`}
              >
                {isLoading ? (
                  <div className="py-8">
                    <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" />
                    <div className="font-mono text-xs tracking-[0.2em] uppercase">
                      PARSING ··· 解析中
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-6">
                      ■ DRAG & DROP / OR SELECT
                    </div>
                    <UploadIcon
                      strokeWidth={1.5}
                      className="w-14 h-14 mx-auto mb-6"
                    />
                    <h2 className="font-display text-3xl sm:text-4xl mb-2">
                      拖拽文件到此处
                    </h2>
                    <p className="text-sm text-foreground/60 mb-8">
                      或点击下方按钮选择本地文件
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="btn-ink"
                    >
                      <FileUp className="w-4 h-4" />
                      选择文件
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.numbers"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFile(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                    <div className="mt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      ACCEPTED · .XLSX · .XLS · .NUMBERS
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* === Requirements === */}
            <div
              className="col-span-12 lg:col-span-4 stagger-in"
              style={{ ["--i" as any]: 3 }}
            >
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
                ■ REQUIREMENTS
              </div>
              <ul className="border-t border-foreground">
                {requirements.map((r) => (
                  <li
                    key={r.code}
                    className="flex items-start gap-3 py-3 border-b border-foreground/15"
                  >
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground pt-1 shrink-0 w-8">
                      {r.code}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground/85">
                      {r.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* === Example === */}
        <section className="border-t border-foreground py-12 sm:py-16">
          <div className="grid grid-cols-12 gap-6 mb-8">
            <div className="col-span-12 sm:col-span-3">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                ■ REFERENCE
              </div>
              <div className="font-display text-2xl mt-2">示例格式</div>
            </div>
            <div className="col-span-12 sm:col-span-9 sm:pt-1">
              <p className="text-sm text-foreground/70 max-w-xl leading-relaxed">
                一个有效的清单应至少包含条码与数量两列。系统会按列名匹配，不区分大小写。
              </p>
            </div>
          </div>

          <div className="border border-foreground overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="text-left py-3 px-4 font-mono text-[10px] tracking-[0.2em] uppercase">
                    ▸ Barcode
                  </th>
                  <th className="text-left py-3 px-4 font-mono text-[10px] tracking-[0.2em] uppercase">
                    ▸ Product Name
                  </th>
                  <th className="text-right py-3 px-4 font-mono text-[10px] tracking-[0.2em] uppercase">
                    ▸ Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["4547691811868", "冈本003玻尿酸", "10"],
                  ["4547691815415", "冈本爽滑快感", "5"],
                  ["6920180201234", "云南白药牙膏", "20"],
                ].map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-foreground/15 hover:bg-foreground/5 transition-colors"
                  >
                    <td className="py-3 px-4 tabular-nums">{row[0]}</td>
                    <td className="py-3 px-4 font-sans">{row[1]}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-display text-base">
                      {row[2]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            3 ROWS · 3 COLUMNS · 35 UNITS
          </div>
        </section>
      </main>
    </div>
  );
}
