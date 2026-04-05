import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useLocation } from "wouter";

export function GarcomLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "waiter")) {
      setLocation("/login/garcom");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user || user.role !== "waiter") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dark">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10 flex-shrink-0">
        <div 
          className="font-bold text-lg text-primary cursor-pointer truncate mr-2"
          onClick={() => setLocation("/garcom")}
        >
          {user.tenantName} <span className="text-muted-foreground text-sm font-normal">| {user.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-2">
        {children}
      </main>
    </div>
  );
}
