import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { MasterLayout } from "@/components/master-layout";
import { useMasterAuth } from "@/lib/master-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart, TrendingUp, Lock, Unlock,
  CreditCard, FlaskConical, DollarSign, AlertTriangle, CheckCircle, Pencil
} from "lucide-react";

interface TenantDetail {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  status: string;
  rawStatus: string;
  monthlyFee: number;
  subscriptionExpiresAt: string | null;
  trialEndsAt: string | null;
  lastPaymentAt: string | null;
  blockReason: string | null;
  createdAt: string;
  totalOrders: number;
  totalRevenue: number;
  monthlyRevenue: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Ativo", color: "text-green-500", icon: CheckCircle },
  trial: { label: "Em Teste", color: "text-blue-500", icon: FlaskConical },
  expiring_soon: { label: "Vencendo em Breve", color: "text-amber-500", icon: AlertTriangle },
  overdue: { label: "Em Atraso", color: "text-orange-500", icon: AlertTriangle },
  blocked: { label: "Bloqueado", color: "text-red-500", icon: Lock },
  overdue_blocked: { label: "Bloqueado (inadimplente)", color: "text-red-500", icon: Lock },
  trial_expired: { label: "Teste Expirado", color: "text-red-500", icon: Lock },
};

export default function MasterRestaurante() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useMasterAuth();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [showFee, setShowFee] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [paymentMonths, setPaymentMonths] = useState(1);
  const [trialDays, setTrialDays] = useState(14);
  const [blockReason, setBlockReason] = useState("");
  const [newFee, setNewFee] = useState("");
  const [editForm, setEditForm] = useState({ name: "", slug: "", phone: "", cnpj: "", address: "" });

  const load = () => {
    setLoading(true);
    apiFetch<TenantDetail>(`/api/master/tenants/${id}`)
      .then(t => {
        setTenant(t);
        setNewFee(String(t.monthlyFee));
        setEditForm({
          name: t.name,
          slug: t.slug,
          phone: t.phone ?? "",
          cnpj: t.cnpj ?? "",
          address: t.address ?? "",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const action = async (fn: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    try {
      await fn();
      toast.success(successMsg);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao executar ação");
    } finally {
      setActionLoading(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading || !tenant) {
    return <MasterLayout title="Restaurante"><div className="text-muted-foreground">Carregando...</div></MasterLayout>;
  }

  const status = STATUS_CONFIG[tenant.status] ?? { label: tenant.status, color: "text-muted-foreground", icon: CheckCircle };
  const StatusIcon = status.icon;
  const isBlocked = ["blocked", "overdue_blocked", "trial_expired"].includes(tenant.status);

  const months = Object.entries(tenant.monthlyRevenue).sort().slice(-6);

  return (
    <MasterLayout title={tenant.name}>
      <div className="space-y-6 max-w-4xl">
        {/* Header card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{tenant.name}</h2>
                <div className="text-muted-foreground">/{tenant.slug}</div>
                {tenant.email && <div className="text-sm mt-1">{tenant.email}</div>}
                {tenant.phone && <div className="text-sm">{tenant.phone}</div>}
                {tenant.address && <div className="text-sm text-muted-foreground">{tenant.address}</div>}
                <div className="text-xs text-muted-foreground mt-2">
                  Cliente desde {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowEdit(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <div className={`flex items-center gap-1.5 font-semibold ${status.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {status.label}
                </div>
                {tenant.blockReason && (
                  <div className="text-xs text-destructive max-w-[200px] text-right">{tenant.blockReason}</div>
                )}
                {(tenant.subscriptionExpiresAt || tenant.trialEndsAt) && (
                  <div className="text-sm text-muted-foreground">
                    {tenant.trialEndsAt
                      ? `Teste até ${new Date(tenant.trialEndsAt).toLocaleDateString("pt-BR")}`
                      : `Vence em ${new Date(tenant.subscriptionExpiresAt!).toLocaleDateString("pt-BR")}`
                    }
                  </div>
                )}
                {tenant.lastPaymentAt && (
                  <div className="text-xs text-muted-foreground">
                    Último pag.: {new Date(tenant.lastPaymentAt).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <ShoppingCart className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-2xl font-bold">{tenant.totalOrders}</div>
              <div className="text-xs text-muted-foreground">Pedidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-xl font-bold">{fmt(tenant.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">Faturamento</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <DollarSign className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-xl font-bold">{fmt(tenant.monthlyFee)}</div>
              <div className="text-xs text-muted-foreground">Mensalidade</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly revenue */}
        {months.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Faturamento por Mês (últimos 6)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {months.map(([month, revenue]) => {
                  const [y, m] = month.split("-");
                  const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                  const maxRev = Math.max(...months.map(([, v]) => v), 1);
                  return (
                    <div key={month} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-muted-foreground capitalize">{label}</div>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(revenue / maxRev) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm font-medium w-24 text-right">{fmt(revenue)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gerenciamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => setShowPayment(true)}
              >
                <CreditCard className="w-5 h-5 text-green-500" />
                <span className="text-xs">Registrar Pagamento</span>
              </Button>

              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => setShowTrial(true)}
              >
                <FlaskConical className="w-5 h-5 text-blue-500" />
                <span className="text-xs">Período de Teste</span>
              </Button>

              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => setShowFee(true)}
              >
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-xs">Alterar Mensalidade</span>
              </Button>

              {isBlocked ? (
                <Button
                  variant="outline"
                  className="gap-2 h-auto py-3 flex-col text-green-500 border-green-500/30 hover:bg-green-500/10"
                  disabled={actionLoading}
                  onClick={() => action(
                    () => apiFetch(`/api/master/tenants/${id}/unblock`, { method: "PATCH" }),
                    "Restaurante desbloqueado!"
                  )}
                >
                  <Unlock className="w-5 h-5" />
                  <span className="text-xs">Desbloquear</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2 h-auto py-3 flex-col text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowBlock(true)}
                >
                  <Lock className="w-5 h-5" />
                  <span className="text-xs">Bloquear</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-green-500" /> Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mensalidade: <strong>{fmt(tenant.monthlyFee)}</strong><br />
              Registrar pagamento estende a assinatura por período escolhido.
            </p>
            <div className="space-y-2">
              <Label>Meses de assinatura</Label>
              <div className="flex gap-2">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMonths(m)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${paymentMonths === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              Valor total: <strong>{fmt(tenant.monthlyFee * paymentMonths)}</strong>
            </div>
            <Button className="w-full" disabled={actionLoading} onClick={() => {
              action(
                () => apiFetch(`/api/master/tenants/${id}/payment`, { method: "POST", body: JSON.stringify({ months: paymentMonths }) }),
                `Pagamento registrado — assinatura extendida por ${paymentMonths} mês(es)!`
              );
              setShowPayment(false);
            }}>
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trial dialog */}
      <Dialog open={showTrial} onOpenChange={setShowTrial}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-blue-500" /> Período de Teste</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Define um período de teste gratuito para o restaurante.</p>
            <div className="space-y-2">
              <Label>Dias de teste</Label>
              <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setTrialDays(d)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${trialDays === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={actionLoading} onClick={() => {
              action(
                () => apiFetch(`/api/master/tenants/${id}/trial`, { method: "POST", body: JSON.stringify({ days: trialDays }) }),
                `Período de teste de ${trialDays} dias ativado!`
              );
              setShowTrial(false);
            }}>
              Ativar Período de Teste
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block dialog */}
      <Dialog open={showBlock} onOpenChange={setShowBlock}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><Lock className="w-4 h-4" /> Bloquear Restaurante</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">O restaurante perderá acesso ao sistema. Garçons e admins não conseguirão entrar.</p>
            <div className="space-y-2">
              <Label>Motivo do bloqueio</Label>
              <Input
                placeholder="Ex: Inadimplência, suspensão temporária..."
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              />
            </div>
            <Button variant="destructive" className="w-full" disabled={actionLoading || !blockReason} onClick={() => {
              action(
                () => apiFetch(`/api/master/tenants/${id}/block`, { method: "PATCH", body: JSON.stringify({ reason: blockReason }) }),
                "Restaurante bloqueado."
              );
              setShowBlock(false);
              setBlockReason("");
            }}>
              Confirmar Bloqueio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee dialog */}
      <Dialog open={showFee} onOpenChange={setShowFee}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Alterar Mensalidade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova mensalidade (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newFee}
                onChange={e => setNewFee(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={actionLoading} onClick={() => {
              action(
                () => apiFetch(`/api/master/tenants/${id}/fee`, { method: "PATCH", body: JSON.stringify({ monthlyFee: parseFloat(newFee) }) }),
                "Mensalidade atualizada!"
              );
              setShowFee(false);
            }}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Restaurante
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async e => {
              e.preventDefault();
              const { name, slug, phone, cnpj, address } = editForm;
              if (!name || !slug || !phone || !cnpj || !address) {
                toast.error("Preencha todos os campos.");
                return;
              }
              await action(
                () => apiFetch(`/api/master/tenants/${id}/info`, {
                  method: "PATCH",
                  body: JSON.stringify({ name, slug, phone, cnpj, address }),
                }),
                "Dados do restaurante atualizados!"
              );
              setShowEdit(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome do Restaurante *</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Boteco do João"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Identificador (slug) *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm shrink-0">/menu/</span>
                  <Input
                    value={editForm.slug}
                    onChange={e => setEditForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    placeholder="boteco-do-joao"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone *</Label>
                <Input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ *</Label>
                <Input
                  value={editForm.cnpj}
                  onChange={e => setEditForm(f => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço *</Label>
                <Input
                  value={editForm.address}
                  onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua das Flores, 123 — SP"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEdit(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={actionLoading}>
                {actionLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
