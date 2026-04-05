import { GarcomLayout } from "@/components/garcom-layout";
import { useListTables, useListOrders } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Plus, Receipt, Pencil, X, Lock, ChevronDown } from "lucide-react";

type Order = NonNullable<ReturnType<typeof useListOrders>["data"]>[number];
type Table = NonNullable<ReturnType<typeof useListTables>["data"]>[number];

export default function GarcomMesas() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: tables, isLoading: isLoadingTables } = useListTables();
  const { data: allOrders } = useListOrders({});

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<number | "">("");
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const activeOrders = (tableId: number) =>
    allOrders?.filter(o => o.tableId === tableId && o.status !== "finalizado" && o.status !== "cancelado") ?? [];

  const selectedActiveOrders = selectedTable ? activeOrders(selectedTable.id) : [];
  const isOccupied = selectedActiveOrders.length > 0;

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
      const verifyRes = await fetch("/api/auth/waiter/login", {
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
      const cancelRes = await fetch(`/api/orders/${cancelOrderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!cancelRes.ok) {
        toast.error("Erro ao cancelar pedido");
        setCancelLoading(false);
        return;
      }

      toast.success("Pedido cancelado com sucesso");
      closeModal();
    } catch {
      toast.error("Erro ao cancelar pedido");
    } finally {
      setCancelLoading(false);
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
            {/* Active orders summary */}
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

            {/* Main actions */}
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

              {/* Cancel form */}
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
    </GarcomLayout>
  );
}
