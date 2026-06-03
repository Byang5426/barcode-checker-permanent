import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, RotateCcw, ArrowUpRight } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { IndustrialHeader } from "@/components/IndustrialHeader";

export default function ChecklistList() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: checklists, isLoading, refetch } = trpc.checklist.list.useQuery(undefined, {
    enabled: !!user,
  });
  const deleteMutation = trpc.checklist.delete.useMutation();
  const resetMutation = trpc.checklist.reset.useMutation();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const handleDelete = async (checklistId: number) => {
    if (!confirm("确定要删除这个清单吗？此操作无法撤销。")) return;
    setDeletingId(checklistId);
    try {
      await deleteMutation.mutateAsync({ checklistId });
      toast.success("清单已删除");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReset = async (checklistId: number) => {
    if (!confirm("确定要重置这个清单吗？所有扫描记录将被清除。")) return;
    setResettingId(checklistId);
    try {
      await resetMutation.mutateAsync({ checklistId });
      toast.success("清单已重置");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    } finally {
      setResettingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const totalCount = checklists?.length ?? 0;
  const completedCount = checklists?.filter((c) => c.completedItems === c.totalItems).length ?? 0;

  return (
    <div className="min-h-screen page-in">
      <IndustrialHeader sectionLabel="MANIFEST / 03" />

      <main className="container">
        {/* === Header band === */}
        <section className="pt-12 pb-8 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-8 stagger-in" style={{ ["--i" as any]: 0 }}>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
              ■ ALL LISTS · MANIFEST
            </div>
            <h1 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-tight">
              我的
              <br />
              <span className="italic">清单</span>
            </h1>
          </div>
          <div
            className="col-span-12 lg:col-span-4 flex flex-col items-start lg:items-end gap-3 stagger-in"
            style={{ ["--i" as any]: 1 }}
          >
            <button
              onClick={() => navigate("/upload")}
              className="btn-ink"
            >
              <Plus className="w-4 h-4" />
              上传新清单
              <ArrowUpRight className="w-3 h-3" />
            </button>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {totalCount} LIST{totalCount !== 1 ? "S" : ""} · {completedCount} COMPLETE
            </div>
          </div>
        </section>

        {/* === Manifest === */}
        <section className="border-t border-foreground">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !checklists || checklists.length === 0 ? (
            <div className="py-24 text-center stagger-in" style={{ ["--i" as any]: 2 }}>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
                ■ EMPTY
              </div>
              <p className="font-display text-3xl sm:text-4xl mb-8">
                还没有清单。
              </p>
              <button
                onClick={() => navigate("/upload")}
                className="btn-ink"
              >
                <Plus className="w-4 h-4" />
                上传第一个清单
              </button>
            </div>
          ) : (
            <ul>
              {checklists.map((checklist, i) => {
                const progress =
                  checklist.totalItems > 0
                    ? Math.round((checklist.completedItems / checklist.totalItems) * 100)
                    : 0;
                const done = checklist.completedItems === checklist.totalItems && checklist.totalItems > 0;
                const idx = String(i + 1).padStart(2, "0");
                return (
                  <li
                    key={checklist.id}
                    className="group border-b border-foreground/20 stagger-in"
                    style={{ ["--i" as any]: 2 + i }}
                  >
                    <div
                      onClick={() => navigate(`/checklist/${checklist.id}`)}
                      className="grid grid-cols-12 gap-4 sm:gap-6 py-6 sm:py-8 cursor-pointer transition-colors hover:bg-foreground/5"
                    >
                      {/* Index */}
                      <div className="col-span-2 sm:col-span-1 font-mono text-xs tracking-widest text-muted-foreground pt-1">
                        {idx}
                      </div>

                      {/* Name + meta */}
                      <div className="col-span-10 sm:col-span-5">
                        <div className="font-display text-2xl sm:text-3xl leading-tight tracking-tight">
                          {checklist.name}
                        </div>
                        <div className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                          <span>FILE · {checklist.fileName}</span>
                          <span>
                            CREATED ·{" "}
                            {new Date(checklist.createdAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                      </div>

                      {/* Progress number */}
                      <div className="col-span-6 sm:col-span-3 flex flex-col justify-center">
                        <div className="font-display tabular-nums text-3xl sm:text-4xl leading-none tracking-tight">
                          {checklist.completedItems}
                          <span className="text-muted-foreground text-2xl sm:text-3xl">
                            {" "}/ {checklist.totalItems}
                          </span>
                        </div>
                        <div className="mt-2 h-[2px] w-full bg-foreground/15 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 progress-fill"
                            style={{
                              width: `${progress}%`,
                              background: done ? "#1b7a3e" : "#e63946",
                            }}
                          />
                        </div>
                        <div className="mt-1.5 font-mono text-[10px] tracking-widest text-muted-foreground flex items-baseline gap-2">
                          <span>{progress}%</span>
                          {done && (
                            <span className="text-verify">· COMPLETE</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-6 sm:col-span-3 flex items-center justify-end gap-2 sm:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReset(checklist.id);
                          }}
                          disabled={resettingId === checklist.id}
                          className="w-9 h-9 border border-foreground/30 hover:border-foreground hover:bg-foreground hover:text-background flex items-center justify-center transition-colors disabled:opacity-30"
                          title="重置"
                        >
                          {resettingId === checklist.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(checklist.id);
                          }}
                          disabled={deletingId === checklist.id}
                          className="w-9 h-9 border border-foreground/30 hover:border-accent hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors disabled:opacity-30"
                          title="删除"
                        >
                          {deletingId === checklist.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div className="w-9 h-9 border border-foreground flex items-center justify-center transition-transform group-hover:translate-x-1">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
