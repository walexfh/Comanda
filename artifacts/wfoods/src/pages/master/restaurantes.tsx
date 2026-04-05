import { useEffect, useState } from "react";
import { MasterLayout } from "@/components/master-layout";
import { useMasterAuth } from "@/lib/master-auth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Link } from "wouter";

interface TenantSummary {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: string;
  monthlyFee: number;
  subscriptionExpiresAt: string | null;
  trialEndsAt: string | null;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  trial: { label: "Teste", variant: "secondary" },
  expiring_soon: { label: "Vencendo", variant: "outline" },
  overdue: { label: "Em atraso", variant: "outline" },
  blocked: { label: "Bloqueado", variant: "destructive" },
  overdue_blocked: { label: "Bloqueado", variant: "destructive" },
  trial_expired: { label: "Teste expirado", variant: "destructive" },
};

export default function MasterRestaurantes() {
  const { apiFetch } = useMasterAuth();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  useEffect(() => {
    apiFetch<TenantSummary[]>("/api/master/tenants")
      .then(setTenants)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "todos" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const statuses = ["todos", "active", "trial", "expiring_soon", "overdue", "blocked", "trial_expired"];

  return (
    <MasterLayout title="Restaurantes">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, slug ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {statuses.map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    filterStatus === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s === "todos" ? "Todos" : cfg?.label ?? s}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{filtered.length} restaurante(s)</p>
            {filtered.map(t => {
              const cfg = STATUS_CONFIG[t.status] ?? { label: t.status, variant: "outline" as const };
              const expiry = t.subscriptionExpiresAt ?? t.trialEndsAt;
              return (
                <Link key={t.id} href={`/master/restaurantes/${t.id}`}>
                  <div className="bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">{t.name}</span>
                          <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          /{t.slug} {t.email ? `• ${t.email}` : ""} {t.phone ? `• ${t.phone}` : ""}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{t.totalOrders} pedidos</span>
                          <span>Faturamento: {fmt(t.totalRevenue)}</span>
                          <span>Desde {new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-primary">{fmt(t.monthlyFee)}<span className="font-normal text-muted-foreground text-xs">/mês</span></div>
                        {expiry && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {t.status.includes("trial") ? "Teste até" : "Vence em"}{" "}
                            {new Date(expiry).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Nenhum restaurante encontrado.</div>
            )}
          </div>
        )}
      </div>
    </MasterLayout>
  );
}
