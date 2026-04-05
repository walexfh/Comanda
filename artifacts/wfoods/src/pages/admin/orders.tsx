import { useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Printer, Bell, Trash2, AlertTriangle } from "lucide-react";
import { ListOrdersStatus } from "@workspace/api-client-react/src/generated/api.schemas";

const statusColors = {
  novo: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  preparando: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  pronto: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  finalizado: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
};

type Order = NonNullable<ReturnType<typeof useListOrders>["data"]>[number];

export default function AdminOrders() {
  useWebSocket();
  const [filter, setFilter] = useState<ListOrdersStatus | "todos">("todos");
  const [kitchenOrder, setKitchenOrder] = useState<Order | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const { data: orders, isLoading } = useListOrders(
    filter !== "todos" ? { status: filter } : {}
  );

  const updateStatus = useUpdateOrderStatus();

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
      setShowClearConfirm(false);
    } catch {
      toast.error("Erro ao limpar pedidos.");
    } finally {
      setClearLoading(false);
    }
  };

  const handleRing = async (id: number) => {
    try {
      const token = localStorage.getItem("wfoods_token");
      const res = await fetch(`${import.meta.env.BASE_URL}api/orders/${id}/ring`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Garçom notificado!");
      } else {
        toast.error("Erro ao notificar garçom");
      }
    } catch {
      toast.error("Erro ao notificar garçom");
    }
  };

  const handleUpdateStatus = (id: number, currentStatus: string) => {
    let nextStatus: ListOrdersStatus = "preparando";
    if (currentStatus === "novo") nextStatus = "preparando";
    else if (currentStatus === "preparando") nextStatus = "pronto";
    else if (currentStatus === "pronto") nextStatus = "finalizado";
    else return;

    updateStatus.mutate(
      { orderId: id, data: { status: nextStatus } },
      {
        onSuccess: () => toast.success("Status atualizado"),
        onError: () => toast.error("Erro ao atualizar status"),
      }
    );
  };

  const handlePrintKitchen = () => {
    const el = document.getElementById("kitchen-ticket-print");
    if (!el) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html><head><title>Comanda Cozinha</title>
      <style>
        body { font-family: monospace; font-size: 16px; margin: 16px; background:#fff; color:#000; }
        h1 { font-size: 24px; text-align:center; margin-bottom:4px; }
        .sub { text-align:center; font-size:13px; color:#555; margin-bottom:16px; }
        .divider { border-top: 2px dashed #000; margin: 12px 0; }
        .item { margin-bottom: 12px; }
        .item-name { font-size: 18px; font-weight: bold; }
        .item-qty { display:inline-block; background:#000; color:#fff; padding:2px 8px; border-radius:4px; font-size:16px; margin-right:8px; }
        .item-obs { font-size:14px; background:#fffde7; border-left:3px solid #f9a825; padding:4px 8px; margin-top:4px; }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <AdminLayout>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #kitchen-ticket-print, #kitchen-ticket-print * { visibility: visible !important; }
          #kitchen-ticket-print { position: fixed; top: 0; left: 0; width: 80mm; }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedidos</h1>
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

      <Tabs defaultValue="todos" onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="mb-4 flex flex-wrap h-auto w-full justify-start">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="novo" className="text-blue-500">Novos</TabsTrigger>
          <TabsTrigger value="preparando" className="text-orange-500">Preparando</TabsTrigger>
          <TabsTrigger value="pronto" className="text-green-500">Prontos</TabsTrigger>
          <TabsTrigger value="finalizado" className="text-gray-500">Finalizados</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders?.map((order) => (
            <Card key={order.id} className="flex flex-col">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {order.tableNumber ? `Mesa ${order.tableNumber}` : "Sem Mesa"}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      #{order.id} • {format(new Date(order.createdAt), "HH:mm")}
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusColors[order.status]}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
                {order.customerName && (
                  <div className="text-sm font-medium mt-1">Cliente: {order.customerName}</div>
                )}
                {order.waiterName && (
                  <div className="text-xs text-muted-foreground">Garçom: {order.waiterName}</div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-1 flex flex-col">
                <div className="flex-1 space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="text-sm border-b border-border/50 pb-2 last:border-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.quantity}x {item.productName}</span>
                        <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                      </div>
                      {item.notes && <div className="text-xs text-muted-foreground mt-1 italic">Obs: {item.notes}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t font-bold mb-3">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                    onClick={() => setKitchenOrder(order)}
                    title="Imprimir comanda da cozinha"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cozinha
                  </Button>

                  {order.status === "pronto" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => handleRing(order.id)}
                      title="Chamar garçom via campainha"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {order.status !== "finalizado" && (
                    <Button
                      className="flex-1 mt-auto"
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      disabled={updateStatus.isPending}
                      variant={order.status === "novo" ? "default" : order.status === "preparando" ? "secondary" : "outline"}
                    >
                      {order.status === "novo" ? "Preparar" :
                        order.status === "preparando" ? "Pronto" :
                          "Finalizar"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!orders || orders.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum pedido encontrado.
            </div>
          )}
        </div>
      )}

      {/* Kitchen Ticket Modal */}
      <Dialog open={!!kitchenOrder} onOpenChange={(open) => !open && setKitchenOrder(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-orange-500" />
              Comanda — Cozinha
            </DialogTitle>
          </DialogHeader>

          {kitchenOrder && (
            <>
              {/* Preview on screen */}
              <div
                id="kitchen-ticket-print"
                className="bg-white text-black rounded-lg border border-border p-4 font-mono text-sm"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {kitchenOrder.tableNumber ? `MESA ${kitchenOrder.tableNumber}` : "BALCÃO"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Pedido #{kitchenOrder.id} • {format(new Date(kitchenOrder.createdAt), "HH:mm")}
                    {kitchenOrder.waiterName && ` • ${kitchenOrder.waiterName}`}
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-gray-400 my-3" />

                <div className="space-y-3">
                  {kitchenOrder.items.map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center gap-2">
                        <span className="bg-black text-white text-sm font-bold px-2 py-0.5 rounded">
                          {item.quantity}x
                        </span>
                        <span className="font-bold text-base">{item.productName}</span>
                      </div>
                      {item.notes && (
                        <div className="ml-9 mt-1 bg-yellow-50 border-l-4 border-yellow-400 pl-2 py-1 text-sm text-gray-800">
                          ⚠️ {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-dashed border-gray-400 mt-3 pt-2 text-center text-xs text-gray-400">
                  {format(new Date(kitchenOrder.createdAt), "dd/MM/yyyy HH:mm")}
                </div>
              </div>

              <Button className="w-full" onClick={handlePrintKitchen}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Comanda
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
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
