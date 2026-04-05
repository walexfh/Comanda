import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface GarcomLayoutProps {
  children: ReactNode;
  title?: string;
  onBack?: () => void;
}

export function GarcomLayout({ children, title, onBack }: GarcomLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "waiter")) {
      setLocation("/login/garcom");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user || user.role !== "waiter") {
    return null;
  }

  const isHome = location === "/garcom";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLocation("/garcom");
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-background dark overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-3 py-2.5 sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          {!isHome && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={handleBack}
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div
            className={`font-bold text-base leading-tight truncate ${isHome ? "cursor-pointer" : ""}`}
            onClick={isHome ? undefined : handleBack}
          >
            {title ? (
              <span className="text-primary">{title}</span>
            ) : (
              <>
                <span className="text-primary">{user.tenantName}</span>
                <span className="text-muted-foreground text-sm font-normal ml-1">| {user.name}</span>
              </>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={logout}>
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
