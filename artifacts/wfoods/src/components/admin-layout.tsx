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
  Printer
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
    <div className="min-h-screen flex flex-col md:flex-row bg-background dark">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border h-16">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">W</div>
          <div className="font-semibold text-sidebar-foreground truncate">{user.tenantName}</div>
        </div>
        <nav className="p-2 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/admin");
            return (
              <Link key={item.href} href={item.href} className="block">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
