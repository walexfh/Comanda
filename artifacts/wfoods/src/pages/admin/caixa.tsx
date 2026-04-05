import { AdminLayout } from "@/components/admin-layout";
import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { format, startOfDay, startOfWeek, startOfMonth, subMonths, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const METHOD_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  cartao: { label: "Cartão", icon: CreditCard, color: "text-blue-400" },
  dinheiro: { label: "Dinheiro", icon: Banknote, color: "text-green-400" },
  pix: { label: "Pix", icon: Smartphone, color: "text-purple-400" },
};

type Period = "hoje" | "semana" | "mes" | "total";

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "hoje": return startOfDay(now);
    case "semana": return startOfWeek(now, { weekStartsOn: 1 });
    case "mes": return startOfMonth(now);
    case "total": return null;
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  semana: "Esta Semana",
  mes: "Este Mês",
  total: "Tudo",
};

export default function AdminCaixa() {
  const { data: payments, isLoading } = useListPayments();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("hoje");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    const start = getPeriodStart(period);
    if (!start) return payments;
    return payments.filter(p => new Date(p.createdAt) >= start);
  }, [payments, period]);

  const summary = useMemo(() => {
    const totals: Record<string, number> = {};
    let grand = 0;
    for (const p of filteredPayments) {
      totals[p.method] = (totals[p.method] ?? 0) + p.amount;
      grand += p.amount;
    }
    return { totals, grand };
  }, [filteredPayments]);

  const handleClearOrders = async () => {
    setClearLoading(true);
    try {
      const token = localStorage.getItem("wfoods_token");
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/orders/all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`${data.deleted} pedido(s) removido(s) com sucesso.`);
      queryClient.invalidateQueries();
      setShowClearConfirm(false);
    } catch {
      toast.error("Erro ao limpar pedidos.");
    } finally {
      setClearLoading(false);
    }
  };

  const handlePrintFechamento = async () => {
    if (filteredPayments.length === 0) {
      toast.error("Nenhum pagamento no período selecionado.");
      return;
    }
    setPrintLoading(true);
    try {
      const token = localStorage.getItem("wfoods_token");
      const base = import.meta.env.BASE_URL ?? "/";
      const fechamento = {
        period: PERIOD_LABELS[period],
        periodStart: getPeriodStart(period)?.toISOString() ?? null,
        generatedAt: new Date().toISOString(),
        totals: summary.totals,
        grand: summary.grand,
        count: filteredPayments.length,
        payments: filteredPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          orderId: p.orderId,
          createdAt: p.createdAt,
        })),
      };
      const res = await fetch(`${base}api/caixa/fechamento/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fechamento }),
      });
      if (!res.ok) throw new Error();
      toast.success("Fechamento enviado para a impressora Caixa!");
    } catch {
      toast.error("Erro ao enviar para impressora. Verifique se a estação Caixa está conectada.");
    } finally {
      setPrintLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Caixa</h1>
        <Button
          variant="destructive"
          size="sm"
          className="gap-2 opacity-80 hover:opacity-100"
          onClick={() => setShowClearConfirm(true)}
        >
          <Trash2 className="w-4 h-4" />
          Limpar Pedidos
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              period === p
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <Tabs defaultValue="pagamentos">
        <TabsList className="mb-6">
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento de Caixa</TabsTrigger>
        </TabsList>

        {/* ── Pagamentos ── */}
        <TabsContent value="pagamentos">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Transações — {PERIOD_LABELS[period]}</CardTitle>
              <CardDescription>
                {filteredPayments.length} pagamento(s) •{" "}
                Total: <span className="font-semibold text-foreground">{formatCurrency(summary.grand)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Banknote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Nenhum pagamento no período selecionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPayments.slice().reverse().map((payment) => {
                    const m = METHOD_LABELS[payment.method];
                    const Icon = m?.icon ?? Banknote;
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md bg-muted ${m?.color ?? "text-muted-foreground"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold">{formatCurrency(payment.amount)}</div>
                            <div className="text-xs text-muted-foreground">
                              Pedido #{payment.orderId} • {format(new Date(payment.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={`capitalize ${m?.color ?? ""}`}>
                          {m?.label ?? payment.method}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fechamento de Caixa ── */}
        <TabsContent value="fechamento">
          <div className="space-y-5">
            {/* Summary cards by method */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(METHOD_LABELS).map(([key, { label, icon: Icon, color }]) => {
                const val = summary.totals[key] ?? 0;
                return (
                  <Card key={key} className={val > 0 ? "border-border" : "opacity-50"}>
                    <CardContent className="p-4">
                      <div className={`flex items-center gap-2 mb-2 ${color}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <div className="text-2xl font-black">{formatCurrency(val)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {filteredPayments.filter(p => p.method === key).length} transação(ões)
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Total Geral</span>
                  </div>
                  <div className="text-2xl font-black text-primary">{formatCurrency(summary.grand)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {filteredPayments.length} transação(ões)
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment breakdown */}
            {filteredPayments.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Composição do Caixa</CardTitle>
                  <CardDescription>Período: {PERIOD_LABELS[period]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(METHOD_LABELS).map(([key, { label, icon: Icon, color }]) => {
                      const val = summary.totals[key] ?? 0;
                      const pct = summary.grand > 0 ? (val / summary.grand) * 100 : 0;
                      if (val === 0) return null;
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                              <span className="font-bold text-sm">{formatCurrency(val)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-3 border-t border-border flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="font-black text-lg text-primary">{formatCurrency(summary.grand)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Print button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                className="gap-2"
                onClick={handlePrintFechamento}
                disabled={printLoading || filteredPayments.length === 0}
              >
                <Printer className="w-5 h-5" />
                {printLoading ? "Enviando..." : "Imprimir Fechamento de Caixa"}
              </Button>
            </div>

            {filteredPayments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum pagamento no período selecionado para gerar o fechamento.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Clear orders confirm dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Limpar Todos os Pedidos
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Essa ação irá <strong>excluir permanentemente</strong> todos os pedidos do sistema, independente do status.
              </span>
              <span className="block text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3">
                ⚠️ Esta ação é <strong>irreversível</strong>. Use apenas para limpar dados de teste ou iniciar um novo ciclo operacional.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowClearConfirm(false)} disabled={clearLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleClearOrders} disabled={clearLoading}>
              {clearLoading ? "Limpando..." : "Confirmar Limpeza"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
