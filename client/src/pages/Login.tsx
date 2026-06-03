import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await loginMutation.mutateAsync({ username, password });
        toast.success("登录成功");
        setTimeout(() => {
          window.location.href = "/barcode/";
        }, 400);
      } else {
        await registerMutation.mutateAsync({ username, password, name });
        toast.success("注册成功，请登录");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-in flex flex-col">
      {/* Top metadata strip */}
      <div className="border-b border-foreground">
        <div className="container flex items-center justify-between h-7 text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-mono">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="pulse-dot" />
              <span>系统在线</span>
            </span>
            <span className="hidden sm:inline">V 1.0 · Industrial Edition</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <span>SECTION · AUTH</span>
          </div>
        </div>
      </div>

      <main className="flex-1 container">
        <div className="grid grid-cols-12 min-h-[calc(100vh-7rem)]">
          {/* LEFT — Editorial cover */}
          <div className="col-span-12 lg:col-span-7 py-12 lg:py-20 lg:pr-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-foreground">
            <div className="stagger-in" style={{ ["--i" as any]: 0 }}>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-8">
                ■ 条码核对系统 · BARCODE VERIFICATION
              </div>
              <h1 className="font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.9] tracking-tight">
                {isLogin ? (
                  <>
                    Welcome
                    <br />
                    <span className="italic text-accent">back,</span>
                    <br />
                    operator.
                  </>
                ) : (
                  <>
                    Create
                    <br />
                    <span className="italic text-accent">your</span>
                    <br />
                    account.
                  </>
                )}
              </h1>
              <p className="mt-8 max-w-md text-base sm:text-lg leading-relaxed text-foreground/80">
                {isLogin
                  ? "登录以继续未完成的核对工作。系统会保留你的全部清单与扫描历史。"
                  : "新操作员注册后即可使用全部功能。账户信息仅保存在本地数据库。"}
              </p>
            </div>

            {/* Barcode visual decoration */}
            <div className="mt-16 stagger-in" style={{ ["--i" as any]: 1 }}>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
                ■ ID STRIP
              </div>
              <div className="flex items-end gap-[2px] h-16">
                {Array.from({ length: 60 }).map((_, i) => {
                  const widths = [2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3];
                  const w = widths[(i * 7) % widths.length];
                  return (
                    <div
                      key={i}
                      className="bg-foreground"
                      style={{ width: `${w}px`, height: "100%", opacity: i % 7 === 0 ? 0.4 : 1 }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex items-baseline justify-between font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                <span>4 547 691 811 868</span>
                <span>CHECK · OK</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="col-span-12 lg:col-span-5 py-12 lg:py-20 lg:pl-12 flex flex-col">
            <div className="stagger-in" style={{ ["--i" as any]: 2 }}>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
                ■ {isLogin ? "FORM · LOGIN" : "FORM · REGISTER"}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl mb-10">
                {isLogin ? "登录" : "注册"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label-cap block mb-2">
                    ▸ USERNAME · 用户名
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="operator_id"
                    required
                    disabled={loading}
                    className="h-12 border border-foreground bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-accent font-mono"
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label className="label-cap block mb-2">
                      ▸ NICKNAME · 昵称（可选）
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="display name"
                      disabled={loading}
                      className="h-12 border border-foreground bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-accent font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="label-cap block mb-2">
                    ▸ PASSWORD · 密码
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "••••••••" : "至少 6 个字符"}
                    required
                    disabled={loading}
                    className="h-12 border border-foreground bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-accent font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-none bg-foreground text-background hover:bg-accent hover:text-accent-foreground border border-foreground font-medium tracking-wide"
                >
                  {loading ? (
                    <span className="font-mono text-sm">处理中 ...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isLogin ? "登录 / SIGN IN" : "注册 / CREATE"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-foreground/30 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                <span>{isLogin ? "NEW OPERATOR?" : "HAVE ACCOUNT?"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword("");
                    setName("");
                  }}
                  disabled={loading}
                  className="text-foreground hover:text-accent transition-colors underline underline-offset-4"
                >
                  {isLogin ? "→ REGISTER" : "→ SIGN IN"}
                </button>
              </div>
            </div>

            <div className="mt-auto pt-12">
              <div className="border border-foreground/40 p-4">
                <div className="label-cap mb-2">■ FEATURES</div>
                <ul className="text-xs sm:text-sm text-foreground/70 space-y-1 leading-relaxed">
                  <li>· Excel / Numbers 清单上传</li>
                  <li>· 摄像头实时扫描</li>
                  <li>· 手动条形码输入</li>
                  <li>· 完整扫描历史追溯</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
