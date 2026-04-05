import { GarcomLayout } from "@/components/garcom-layout";
import { useListTables, useListOrders } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Receipt, Pencil, X, Lock, ChevronDown, History, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Order = NonNullable<ReturnType<typeof useListOrders>["data"]>[number];
type Table = NonNullable<ReturnType<typeof useListTables>["data"]>[number];

export default function GarcomMesas() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tables, isLoading: isLoadingTables } = useListTables();
  const { data: allOrders } = useListOrders({});
  const { data: finalizedOrders } = useListOrders({ status: "finalizado" });

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<number | "">("");
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [reactivateTable, setReactivateTable] = useState<{ tableId: number; tableNumber: number | string; orderIds: number[] } | null>(null);
  const [reactivatePassword, setReactivatePassword] = useState("");
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const activeOrders = (tableId: number) =>
    allOrders?.filter(o => o.tableId === tableId && o.status !== "finalizado" && o.status !== "cancelado") ?? [];

  const selectedActiveOrders = selectedTable ? activeOrders(selectedTable.id) : [];
  const isOccupied = selectedActiveOrders.length > 0;

  const tableMap = useMemo(() => {
    const map: Record<number, number | string> = {};
    tables?.forEach(t => { map[t.id] = t.number; });
    return map;
  }, [tables]);

  const historySessions = useMemo(() => {
    if (!finalizedOrders || finalizedOrders.length === 0) return [];

    const SESSION_GAP_MS = 2 * 60 * 60 * 1000;

    const byTable: Record<number, Order[]> = {};
    for (const order of finalizedOrders) {
      if (!order.tableId) continue;
      if (!byTable[order.tableId]) byTable[order.tableId] = [];
      byTable[order.tableId].push(order);
    }

    const sessions: {
      tableId: number;
      tableNumber: number | string;
      orders: Order[];
      closedAt: string;
      total: number;
      orderIds: number[];
    }[] = [];

    for (const [tableIdStr, orders] of Object.entries(byTable)) {
      const tableId = parseInt(tableIdStr);
      const tableNumber = tableMap[tableId] ?? tableId;

      const sorted = [...orders].sort((a, b) =>
        new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime()
      );

      let currentCluster: Order[] = [];
      let clusterAnchor = new Date(sorted[0].updatedAt ?? sorted[0].createdAt).getTime();

      for (const order of sorted) {
        const t = new Date(order.updatedAt ?? order.createdAt).getTime();
        if (currentCluster.length > 0 && t - clusterAnchor > SESSION_GAP_MS) {
          const latestInCluster = currentCluster[currentCluster.length - 1];
          sessions.push({
            tableId,
            tableNumber,
            orders: currentCluster,
            closedAt: latestInCluster.updatedAt ?? latestInCluster.createdAt,
            total: currentCluster.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0),
            orderIds: currentCluster.map(o => o.id),
          });
          currentCluster = [];
          clusterAnchor = t;
        }
        currentCluster.push(order);
      }

      if (currentCluster.length > 0) {
        const latestInCluster = currentCluster[currentCluster.length - 1];
        sessions.push({
          tableId,
          tableNumber,
          orders: currentCluster,
          closedAt: latestInCluster.updatedAt ?? latestInCluster.createdAt,
          total: currentCluster.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0),
          orderIds: currentCluster.map(o => o.id),
        });
      }
    }

    return sessions
      .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
      .slice(0, 30);
  }, [finalizedOrders, tableMap]);

  const closeModal = () => {
    setSelectedTable(null);
    setShowCancel(false);
    setCancelOrderId("");
    setCancelPassword("");
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId || !cancelPassword || !user) return;
    setCancelLoading(true);
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const verifyRes = await fetch(`${base}api/auth/waiter/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, password: cancelPassword, tenantSlug: user.tenantSlug }),
      });

      if (!verifyRes.ok) {
        toast.error("Senha incorreta");
        setCancelLoading(false);
        return;
      }

      const token = localStorage.getItem("wfoods_token");
      const cancelRes = await fetch(`${base}api/orders/${cancelOrderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!cancelRes.ok) {
        toast.error("Erro ao cancelar pedido");
        setCancelLoading(false);
        return;
      }

      toast.success("Pedido cancelado com sucesso");
      queryClient.invalidateQueries();
      closeModal();
    } catch {
      toast.error("Erro ao cancelar pedido");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTable || !reactivatePassword || !user) return;
    setReactivateLoading(true);
    try {
      const base = import.meta.env.BASE_URL ?? "/";

      const verifyRes = await fetch(`${base}api/auth/waiter/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, password: reactivatePassword, tenantSlug: user.tenantSlug }),
      });

      if (!verifyRes.ok) {
        toast.error("Senha incorreta");
        setReactivateLoading(false);
        return;
      }

      const token = localStorage.getItem("wfoods_token");
      const reopenRes = await fetch(`${base}api/tables/${reactivateTable.tableId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderIds: reactivateTable.orderIds }),
      });

      if (!reopenRes.ok) throw new Error();

      toast.success(`Mesa ${reactivateTable.tableNumber} reativada! Os pedidos voltaram para 'Pronto'.`);
      queryClient.invalidateQueries();
      setReactivateTable(null);
      setReactivatePassword("");
      setShowHistory(false);
    } catch {
      toast.error("Erro ao reativar mesa");
    } finally {
      setReactivateLoading(false);
    }
  };

  if (isLoadingTables) {
    return <GarcomLayout><div className="p-4 text-center text-muted-foreground">Carregando mesas...</div></GarcomLayout>;
  }

  return (
    <GarcomLayout>
      <div className="p-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))" }}>
        {tables?.map((table) => {
          const occupied = activeOrders(table.id).length > 0;
          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-2xl text-center
                font-bold transition-all active:scale-95
                ${occupied
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-card border-2 border-border text-foreground hover:border-primary/50"}
              `}
            >
              <span className="text-4xl font-black leading-none">{table.number}</span>
              {table.label && (
                <span className="text-[10px] mt-1 opacity-70 px-1 truncate max-w-full">{table.label}</span>
              )}
              {occupied && (
                <span className="text-[10px] mt-1 font-bold opacity-80">OCUPADA</span>
              )}
            </button>
          );
        })}

        {(!tables || tables.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Nenhuma mesa disponível.
          </div>
        )}
      </div>

      {/* Histórico button */}
      <div className="px-3 pb-4">
        <button
          onClick={() => setShowHistory(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors text-sm font-medium"
        >
          <History className="w-4 h-4" />
          Histórico de Mesas
          {historySessions.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{historySessions.length}</Badge>
          )}
        </button>
      </div>

      {/* Table options modal */}
      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className={`p-4 pb-3 ${isOccupied ? "bg-primary/10 border-b border-primary/20" : "border-b border-border"}`}>
            <DialogTitle className="text-2xl font-black">
              Mesa {selectedTable?.number}
              {selectedTable?.label && (
                <span className="text-sm font-normal text-muted-foreground ml-2">{selectedTable.label}</span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              {isOccupied ? (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {selectedActiveOrders.length} pedido{selectedActiveOrders.length > 1 ? "s" : ""} ativo{selectedActiveOrders.length > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="secondary">Livre</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="p-4 space-y-3">
            {isOccupied && (
              <div className="space-y-2">
                {selectedActiveOrders.map((order) => (
                  <div key={order.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">Pedido #{order.id}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "HH:mm")}</span>
                        <Badge variant="outline" className="text-xs px-1.5">
                          {order.status === "novo" ? "Novo" : order.status === "preparando" ? "Preparando" : "Pronto"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs space-y-0.5">
                      {order.items.slice(0, 3).map(item => (
                        <div key={item.id}>{item.quantity}x {item.productName}</div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-primary">+ {order.items.length - 3} item(s)...</div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                      <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => { closeModal(); setLocation(`/garcom/pedido/${selectedTable!.id}`); }}
                      >
                        <Pencil className="w-3 h-3" />
                        Adicionar Itens
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <Button
                className="w-full gap-2 h-12 text-base"
                onClick={() => { closeModal(); setLocation(`/garcom/pedido/${selectedTable!.id}`); }}
              >
                <Plus className="w-5 h-5" />
                Novo Pedido
              </Button>

              {isOccupied && (
                <Button
                  variant="outline"
                  className="w-full gap-2 h-12 text-base text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => { closeModal(); setLocation(`/garcom/fechar/${selectedTable!.id}`); }}
                >
                  <Receipt className="w-5 h-5" />
                  Fechar Conta
                </Button>
              )}

              {isOccupied && (
                <button
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
                  onClick={() => {
                    setShowCancel(!showCancel);
                    if (!showCancel && selectedActiveOrders.length === 1) {
                      setCancelOrderId(selectedActiveOrders[0].id);
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Cancelar Pedido
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCancel ? "rotate-180" : ""}`} />
                </button>
              )}

              {isOccupied && showCancel && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
                  {selectedActiveOrders.length > 1 && (
                    <select
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                      value={cancelOrderId}
                      onChange={e => setCancelOrderId(Number(e.target.value))}
                    >
                      <option value="">Selecionar pedido...</option>
                      {selectedActiveOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          Pedido #{o.id} — {format(new Date(o.createdAt), "HH:mm")} — {formatCurrency(o.total)}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Sua senha para confirmar"
                      className="pl-9"
                      value={cancelPassword}
                      onChange={e => setCancelPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCancelOrder()}
                    />
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!cancelOrderId || !cancelPassword || cancelLoading}
                    onClick={handleCancelOrder}
                  >
                    {cancelLoading ? "Cancelando..." : "Confirmar Cancelamento"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History modal */}
      <Dialog open={showHistory} onOpenChange={(open) => { if (!open) { setShowHistory(false); setReactivateTable(null); setReactivatePassword(""); } }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
          <DialogHeader className="p-4 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Mesas
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Mesas fechadas recentemente. Para reativar, use sua senha.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {historySessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum histórico encontrado.</p>
              </div>
            ) : (
              historySessions.map(session => (
                <div key={session.tableId} className="border border-border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Mesa {session.tableNumber}</span>
                        <Badge variant="secondary" className="text-xs bg-gray-500/10 text-gray-400">Fechada</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(session.closedAt), "dd/MM HH:mm", { locale: ptBR })} • {session.orders.length} pedido{session.orders.length !== 1 ? "s" : ""} • {formatCurrency(session.total)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 flex-shrink-0 h-8"
                      onClick={() => {
                        setReactivateTable({
                          tableId: session.tableId,
                          tableNumber: session.tableNumber,
                          orderIds: session.orderIds,
                        });
                        setReactivatePassword("");
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reativar
                    </Button>
                  </div>

                  {reactivateTable?.tableId === session.tableId && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        Digite sua senha para confirmar a reativação
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Sua senha"
                          value={reactivatePassword}
                          onChange={e => setReactivatePassword(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleReactivate()}
                          className="flex-1 h-9 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="gap-1.5 h-9"
                          disabled={!reactivatePassword || reactivateLoading}
                          onClick={handleReactivate}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {reactivateLoading ? "..." : "Confirmar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </GarcomLayout>
  );
}
