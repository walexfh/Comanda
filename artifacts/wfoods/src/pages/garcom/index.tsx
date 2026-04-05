import { GarcomLayout } from "@/components/garcom-layout";
import { useListTables, useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GarcomMesas() {
  useWebSocket();
  const { data: tables, isLoading: isLoadingTables } = useListTables();
  const { data: activeOrders, isLoading: isLoadingOrders } = useListOrders({});

  if (isLoadingTables || isLoadingOrders) {
    return <GarcomLayout><div className="p-4 text-center">Carregando...</div></GarcomLayout>;
  }

  return (
    <GarcomLayout>
      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tables?.map((table) => {
          const hasActiveOrder = activeOrders?.some(
            o => o.tableId === table.id && o.status !== "finalizado"
          );

          return (
            <div
              key={table.id}
              className={`flex flex-col rounded-xl border-2 overflow-hidden transition-colors
                ${hasActiveOrder
                  ? "bg-primary/10 border-primary"
                  : "bg-card border-border"
                }`}
            >
              {/* Table number area — tapping goes to new order */}
              <Link href={`/garcom/pedido/${table.id}`} className="flex-1">
                <div className="flex flex-col items-center justify-center py-5 px-2 cursor-pointer hover:bg-primary/5 transition-colors">
                  <span className={`text-4xl font-bold ${hasActiveOrder ? "text-primary" : "text-foreground"}`}>
                    {table.number}
                  </span>
                  {table.label && (
                    <span className="text-xs mt-1 text-muted-foreground truncate w-full text-center">
                      {table.label}
                    </span>
                  )}
                  {hasActiveOrder && (
                    <span className="text-xs font-bold mt-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      OCUPADA
                    </span>
                  )}
                </div>
              </Link>

              {/* Action buttons — shown on all tables, "Fechar" only on occupied */}
              <div className={`flex border-t ${hasActiveOrder ? "border-primary/30" : "border-border"}`}>
                <Link href={`/garcom/pedido/${table.id}`} className="flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 rounded-none text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Pedido
                  </Button>
                </Link>
                {hasActiveOrder && (
                  <Link href={`/garcom/fechar/${table.id}`} className="flex-1 border-l border-primary/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-10 rounded-none text-xs gap-1 hover:bg-amber-500/10 hover:text-amber-400 text-amber-500"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Fechar
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {(!tables || tables.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Nenhuma mesa disponível.
          </div>
        )}
      </div>
    </GarcomLayout>
  );
}
