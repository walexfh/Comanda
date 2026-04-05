import { ReactNode, useEffect } from "react";
import { useMasterAuth } from "@/lib/master-auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Building2, ChevronRight } from "lucide-react";
import { useLocation, Link } from "wouter";

interface MasterLayoutProps {
  children: ReactNode;
  title: string;
}

export function MasterLayout({ children, title }: MasterLayoutProps) {
  const { user, isLoading, logout } = useMasterAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/master/login");
    }
  }, [user, isLoading]);

  if (isLoading || !user) return null;

  const nav = [
    { href: "/master", label: "Dashboard", icon: LayoutDashboard },
    { href: "/master/restaurantes", label: "Restaurantes", icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <div className="font-black text-xl text-primary">WFoods <span className="text-muted-foreground font-normal text-sm">Master</span></div>
          <nav className="hidden sm:flex gap-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant={location === href ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="sm:hidden flex border-b border-border bg-card px-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex-1">
            <Button
              variant={location === href ? "default" : "ghost"}
              size="sm"
              className="w-full gap-1.5 rounded-none"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Page header */}
      <div className="border-b border-border px-6 py-4 bg-card/50">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      {/* Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
