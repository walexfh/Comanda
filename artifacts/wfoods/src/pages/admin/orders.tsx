import { useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { ListOrdersStatus } from "@workspace/api-client-react/src/generated/api.schemas";

const statusColors = {
  novo: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  preparando: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  pronto: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  finalizado: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
};

export default function AdminOrders() {
  useWebSocket();
  const [filter, setFilter] = useState<ListOrdersStatus | "todos">("todos");
  
  const { data: orders, isLoading } = useListOrders(
    filter !== "todos" ? { status: filter } : {}
  );
  
  const updateStatus = useUpdateOrderStatus();

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

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedidos</h1>
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
                <div className="flex justify-between items-center pt-2 border-t font-bold mb-4">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                
                {order.status !== "finalizado" && (
                  <Button 
                    className="w-full mt-auto" 
                    onClick={() => handleUpdateStatus(order.id, order.status)}
                    disabled={updateStatus.isPending}
                    variant={order.status === "novo" ? "default" : order.status === "preparando" ? "secondary" : "outline"}
                  >
                    {order.status === "novo" ? "Começar a Preparar" : 
                     order.status === "preparando" ? "Marcar como Pronto" : 
                     "Finalizar Pedido"}
                  </Button>
                )}
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
    </AdminLayout>
  );
}
