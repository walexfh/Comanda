import { useEffect, useState } from "react";
import { MasterLayout } from "@/components/master-layout";
import { useMasterAuth } from "@/lib/master-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, PlusCircle, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface TenantSummary {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function MasterRestaurantes() {
  const { apiFetch } = useMasterAuth();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    name: "", slug: "", phone: "", cnpj: "", address: "", adminEmail: "", adminPassword: "",
  });

  const load = () => {
    setLoading(true);
    apiFetch<TenantSummary[]>("/api/master/tenants")
      .then(setTenants)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "todos" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const statuses = ["todos", "active", "trial", "expiring_soon", "overdue", "blocked", "trial_expired"];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, slug, phone, cnpj, address, adminEmail, adminPassword } = form;
    if (!name || !slug || !phone || !cnpj || !address || !adminEmail || !adminPassword) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/api/master/tenants", {
        method: "POST",
        body: JSON.stringify({ name, slug, phone, cnpj, address, adminEmail, adminPassword }),
      });
      toast.success(`Restaurante "${name}" criado com sucesso!`);
      setShowCreate(false);
      setForm({ name: "", slug: "", phone: "", cnpj: "", address: "", adminEmail: "", adminPassword: "" });
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar restaurante.");
    } finally {
      setCreating(false);
    }
  };

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
          <Button className="gap-2 shrink-0" onClick={() => setShowCreate(true)}>
            <PlusCircle className="w-4 h-4" />
            Adicionar Restaurante
          </Button>
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
                          /{t.slug}{t.email ? ` • ${t.email}` : ""}{t.phone ? ` • ${t.phone}` : ""}
                        </div>
                        {t.cnpj && <div className="text-xs text-muted-foreground">CNPJ: {t.cnpj}</div>}
                        {t.address && <div className="text-xs text-muted-foreground">{t.address}</div>}
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

      {/* Create restaurant dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" />
              Adicionar Restaurante
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome do Restaurante *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
                  placeholder="Boteco do João"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Identificador (slug) *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm shrink-0">/menu/</span>
                  <Input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    placeholder="boteco-do-joao"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone *</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" required />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ *</Label>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço *</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua das Flores, 123 — SP" required />
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso do Administrador</p>
              <div className="space-y-1.5">
                <Label>E-mail do admin *</Label>
                <Input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="admin@restaurante.com" required />
              </div>
              <div className="space-y-1.5">
                <Label>Senha inicial *</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.adminPassword}
                    onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={creating}>
                {creating ? "Criando..." : "Criar Restaurante"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
