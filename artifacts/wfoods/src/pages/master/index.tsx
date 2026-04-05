import { useEffect, useState } from "react";
import { MasterLayout } from "@/components/master-layout";
import { useMasterAuth } from "@/lib/master-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle, Clock, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  total: number;
  active: number;
  trial: number;
  blocked: number;
  expiringSoon: number;
  overdue: number;
}

interface TenantSummary {
  id: number;
  name: string;
  slug: string;
  status: string;
  monthlyFee: number;
  subscriptionExpiresAt: string | null;
  trialEndsAt: string | null;
  totalRevenue: number;
  createdAt: string;
}

export default function MasterDashboard() {
  const { apiFetch } = useMasterAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<DashboardStats>("/api/master/dashboard"),
      apiFetch<TenantSummary[]>("/api/master/tenants"),
    ]).then(([s, t]) => {
      setStats(s);
      setTenants(t);
    }).finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, { label: string; color: string }> = {
    active: { label: "Ativo", color: "text-green-500" },
    trial: { label: "Teste", color: "text-blue-500" },
    blocked: { label: "Bloqueado", color: "text-red-500" },
    overdue_blocked: { label: "Bloqueado", color: "text-red-500" },
    trial_expired: { label: "Teste expirado", color: "text-red-500" },
    overdue: { label: "Em atraso", color: "text-orange-500" },
    expiring_soon: { label: "Vencendo", color: "text-amber-500" },
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const urgentTenants = tenants.filter(t =>
    ["blocked", "overdue_blocked", "trial_expired", "overdue", "expiring_soon"].includes(t.status)
  );

  return (
    <MasterLayout title="Dashboard">
      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Building2 className="w-4 h-4" /> Total
                </div>
                <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
                  <CheckCircle className="w-4 h-4" /> Ativos
                </div>
                <div className="text-3xl font-bold text-green-600">{stats?.active ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
                  <Clock className="w-4 h-4" /> Em Teste
                </div>
                <div className="text-3xl font-bold text-blue-600">{stats?.trial ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-orange-500 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" /> Vencendo
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {(stats?.expiringSoon ?? 0) + (stats?.overdue ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
                  <XCircle className="w-4 h-4" /> Bloqueados
                </div>
                <div className="text-3xl font-bold text-red-600">{stats?.blocked ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* MRR summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Receita Mensal Recorrente (MRR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {fmt(tenants.filter(t => t.status === "active").reduce((a, t) => a + t.monthlyFee, 0))}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {tenants.filter(t => t.status === "active").length} restaurantes ativos
              </p>
            </CardContent>
          </Card>

          {/* Attention needed */}
          {urgentTenants.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Requer Atenção ({urgentTenants.length})
              </h2>
              <div className="space-y-2">
                {urgentTenants.map(t => {
                  const s = statusLabel[t.status] ?? { label: t.status, color: "text-muted-foreground" };
                  const expiry = t.subscriptionExpiresAt ?? t.trialEndsAt;
                  return (
                    <Link key={t.id} href={`/master/restaurantes/${t.id}`}>
                      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors cursor-pointer">
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-sm text-muted-foreground">{t.slug}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold text-sm ${s.color}`}>{s.label}</div>
                          {expiry && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(expiry).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent restaurants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Todos os Restaurantes</h2>
              <Link href="/master/restaurantes">
                <span className="text-primary text-sm hover:underline cursor-pointer">Ver todos →</span>
              </Link>
            </div>
            <div className="space-y-2">
              {tenants.slice(0, 5).map(t => {
                const s = statusLabel[t.status] ?? { label: t.status, color: "text-muted-foreground" };
                return (
                  <Link key={t.id} href={`/master/restaurantes/${t.id}`}>
                    <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors cursor-pointer">
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-sm text-muted-foreground">{t.slug} • desde {new Date(t.createdAt).toLocaleDateString("pt-BR")}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold text-sm ${s.color}`}>{s.label}</div>
                        <div className="text-sm text-muted-foreground">{fmt(t.monthlyFee)}/mês</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </MasterLayout>
  );
}
