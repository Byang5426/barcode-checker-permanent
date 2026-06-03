import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  index: string;
}

const NAV: NavItem[] = [
  { label: "工作台", href: "/", index: "01" },
  { label: "上传清单", href: "/upload", index: "02" },
  { label: "我的清单", href: "/checklists", index: "03" },
];

interface IndustrialHeaderProps {
  /** Optional section title shown in mono under the brand mark (e.g. "UPLOAD / 02") */
  sectionLabel?: string;
  /** Hide the nav row (used on the login page) */
  hideNav?: boolean;
}

export function IndustrialHeader({ sectionLabel, hideNav = false }: IndustrialHeaderProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (err) {
      toast.error("退出失败");
    }
  };

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <header className="border-b border-foreground">
      {/* Top metadata strip */}
      <div className="border-b border-foreground/20">
        <div className="container flex items-center justify-between h-7 text-[10px] tracking-[0.18em] uppercase text-muted-foreground font-mono">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="pulse-dot" />
              <span>系统在线</span>
            </span>
            <span className="hidden sm:inline">V 1.0 · Industrial Edition</span>
            <span className="hidden md:inline">{today}</span>
          </div>
          <div className="flex items-center gap-6">
            {user && (
              <span className="hidden sm:inline">
                OPERATOR · {user.name || user.username}
              </span>
            )}
            {user && !hideNav && (
              <button
                onClick={handleLogout}
                className="hover:text-foreground transition-colors"
              >
                退出 / LOGOUT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brand bar */}
      <div className="container flex items-end justify-between py-5">
        <Link href="/">
          <a className="block group">
            <div className="font-display text-3xl sm:text-4xl leading-none tracking-tight">
              条码核对系统
            </div>
            <div className="mt-1.5 font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
              Barcode · Verification · System
            </div>
          </a>
        </Link>
        {sectionLabel && (
          <div className="hidden md:flex items-center gap-2 pb-1">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Section
            </span>
            <span className="font-mono text-xs tracking-widest text-foreground border border-foreground px-2 py-1">
              {sectionLabel}
            </span>
          </div>
        )}
      </div>

      {/* Nav (sticky-ish row) */}
      {!hideNav && user && (
        <nav className="border-t border-foreground">
          <div className="container flex items-stretch overflow-x-auto">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? location === "/"
                  : location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`group flex items-center gap-3 px-5 py-3 border-r border-foreground/30 text-sm tracking-wide whitespace-nowrap transition-colors ${
                      active
                        ? "bg-foreground text-background"
                        : "hover:bg-foreground/5"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] tracking-widest ${
                        active ? "text-background/60" : "text-muted-foreground"
                      }`}
                    >
                      {item.index}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
