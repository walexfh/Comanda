import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  ListOrdered, 
  MenuSquare, 
  Grid2X2, 
  Users, 
  Wallet, 
  BarChart3, 
  LogOut,
  Printer,
  ChevronRight
} from "lucide-react";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/orders", icon: ListOrdered, label: "Pedidos" },
    { href: "/admin/cardapio", icon: MenuSquare, label: "Cardápio" },
    { href: "/admin/mesas", icon: Grid2X2, label: "Mesas" },
    { href: "/admin/garcons", icon: Users, label: "Garçons" },
    { href: "/admin/caixa", icon: Wallet, label: "Caixa" },
    { href: "/admin/relatorios", icon: BarChart3, label: "Relatórios" },
    { href: "/admin/impressoras", icon: Printer, label: "Impressoras" },
  ];

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      setLocation("/login/admin");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user || user.role !== "admin") {
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f1f5f9]">
      {/* Sidebar */}
      <aside className="w-full md:w-60 flex-shrink-0 flex flex-col" style={{ background: "linear-gradient(180deg, #1a3d2b 0%, #14532d 100%)" }}>
        {/* Logo / Brand */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-black text-white text-sm shadow-inner">W</div>
          <div>
            <div className="font-bold text-white text-sm leading-tight truncate max-w-[136px]">{user.tenantName}</div>
            <div className="text-green-300 text-xs font-medium">Painel Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href + "/") && item.href !== "/admin") || (item.href !== "/admin" && location.startsWith(item.href));
            const exactActive = item.href === "/admin" ? location === "/admin" : isActive;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer select-none ${
                    exactActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-green-100/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${exactActive ? "text-green-300" : "text-green-400/70"}`} />
                  <span className="flex-1">{item.label}</span>
                  {exactActive && <ChevronRight className="w-3.5 h-3.5 text-green-300/60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-100/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer select-none"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-green-400/70" />
            <span>Sair</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shadow-sm flex-shrink-0">
          <h2 className="text-slate-700 font-semibold text-sm truncate">
            {navItems.find(i => i.href === location || (location.startsWith(i.href) && i.href !== "/admin"))?.label ?? "Dashboard"}
          </h2>
          <div className="flex-1" />
          <span className="text-xs text-slate-400 font-medium">{user.email}</span>
        </header>

        <div className="flex-1 overflow-y-auto p-5 md:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}
