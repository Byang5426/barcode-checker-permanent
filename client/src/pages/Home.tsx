import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { IndustrialHeader } from "@/components/IndustrialHeader";
import { Upload, List, ArrowUpRight } from "lucide-react";

const FEATURES = [
  { code: "F.01", title: "清单解析", body: "支持 Excel 与 Numbers 文件，自动识别条码、名称、数量列。" },
  { code: "F.02", title: "摄像头扫描", body: "实时摄像头条形码识别，硬件即插即用。" },
  { code: "F.03", title: "手动输入", body: "无摄像头或难扫描商品，可直接键入条码。" },
  { code: "F.04", title: "进度追踪", body: "每件商品独立计数，完整历史可追溯。" },
];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen page-in">
      <IndustrialHeader sectionLabel="WORKBENCH / 01" />

      <main className="container">
        {/* === HERO === */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 stagger-in" style={{ ["--i" as any]: 0 }}>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-6">
              ■ OPERATOR CONSOLE · {user?.name || user?.username}
            </div>
            <h1 className="font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.9] tracking-tight">
              把每一件
              <br />
              <span className="italic text-accent">商品</span>
              <br />
              数清楚。
            </h1>
            <p className="mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-foreground/80">
              上传清单后，用摄像头或键盘逐件核对。<br className="hidden sm:inline" />
              系统会为你记录每一次扫描，并实时显示完成度。
            </p>
          </div>

          <div
            className="col-span-12 lg:col-span-4 flex flex-col justify-end items-start lg:items-end stagger-in"
            style={{ ["--i" as any]: 1 }}
          >
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
              ◷ STATUS
            </div>
            <div className="border border-foreground w-full max-w-[280px]">
              <div className="p-4 flex items-baseline justify-between border-b border-foreground/30">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Active
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="pulse-dot" />
                  ONLINE
                </span>
              </div>
              <div className="p-4 flex items-baseline justify-between border-b border-foreground/30">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Mode
                </span>
                <span className="font-mono text-xs">VERIFY · 扫码核对</span>
              </div>
              <div className="p-4 flex items-baseline justify-between">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Build
                </span>
                <span className="font-mono text-xs">v1.0.0 / 2026</span>
              </div>
            </div>
          </div>
        </section>

        {/* === ACTIONS — asymmetric layout === */}
        <section className="border-t border-foreground">
          <div className="grid grid-cols-12 gap-0">
            {/* Primary action: Upload — big block */}
            <button
              onClick={() => setLocation("/upload")}
              className="group col-span-12 lg:col-span-7 relative text-left p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-foreground bg-foreground text-background hover:bg-accent hover:text-accent-foreground transition-colors duration-500 stagger-in"
              style={{ ["--i" as any]: 2 }}
            >
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-70 mb-6">
                ■ ACTION 01 · PRIMARY
              </div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
                    上传
                    <br />
                    新清单
                  </h2>
                  <p className="mt-6 max-w-md text-sm sm:text-base opacity-80 leading-relaxed">
                    从 Excel 或 Numbers 导入，系统自动解析产品、条码与目标数量。
                  </p>
                </div>
                <Upload
                  strokeWidth={1.5}
                  className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </div>
              <div className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase border border-current px-3 py-1.5">
                开始上传
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </button>

            {/* Secondary action: My Checklists — smaller block */}
            <button
              onClick={() => setLocation("/checklists")}
              className="group col-span-12 lg:col-span-5 relative text-left p-8 sm:p-12 lg:p-16 hover:bg-foreground/5 transition-colors stagger-in"
              style={{ ["--i" as any]: 3 }}
            >
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-6">
                ■ ACTION 02 · SECONDARY
              </div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
                    我的
                    <br />
                    清单
                  </h2>
                  <p className="mt-6 text-sm sm:text-base text-foreground/70 max-w-xs leading-relaxed">
                    查看已上传的清单，继续未完成的核对工作。
                  </p>
                </div>
                <List
                  strokeWidth={1.5}
                  className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </div>
              <div className="mt-10 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase border border-foreground px-3 py-1.5 group-hover:bg-foreground group-hover:text-background transition-colors">
                查看清单
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </section>

        {/* === FEATURES — numbered list, NOT 4-col grid === */}
        <section className="py-16 sm:py-24">
          <div className="grid grid-cols-12 gap-6 mb-10">
            <div className="col-span-12 sm:col-span-3">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                ■ SECTION
              </div>
              <div className="font-display text-2xl mt-2">功能</div>
            </div>
            <div className="col-span-12 sm:col-span-9 sm:pt-1">
              <p className="text-foreground/70 text-sm sm:text-base leading-relaxed max-w-2xl">
                为仓库与零售场景设计的核对工具。系统保持轻量，本地存储，登录即用。
              </p>
            </div>
          </div>

          <div className="border-t border-foreground">
            {FEATURES.map((f, i) => (
              <div
                key={f.code}
                className="grid grid-cols-12 gap-4 sm:gap-6 py-6 sm:py-8 border-b border-foreground/20 stagger-in"
                style={{ ["--i" as any]: 4 + i }}
              >
                <div className="col-span-3 sm:col-span-2 font-mono text-xs tracking-widest text-muted-foreground">
                  {f.code}
                </div>
                <div className="col-span-9 sm:col-span-3 font-display text-2xl sm:text-3xl leading-none">
                  {f.title}
                </div>
                <div className="col-span-12 sm:col-span-7 text-sm sm:text-base text-foreground/75 leading-relaxed">
                  {f.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === FOOTER STRIP === */}
        <footer className="border-t border-foreground py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          <div>条码核对系统 · INDUSTRIAL EDITION · MMXXVI</div>
          <div>FOR WAREHOUSE & RETAIL USE</div>
        </footer>
      </main>
    </div>
  );
}
