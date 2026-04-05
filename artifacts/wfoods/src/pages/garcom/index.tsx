import { GarcomLayout } from "@/components/garcom-layout";
import { useListTables, useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";

export default function GarcomMesas() {
  useWebSocket();
  const { data: tables, isLoading: isLoadingTables } = useListTables();
  const { data: activeOrders, isLoading: isLoadingOrders } = useListOrders({ status: "novo" }); // Could get all active and map

  if (isLoadingTables || isLoadingOrders) {
    return <GarcomLayout><div className="p-4 text-center">Carregando...</div></GarcomLayout>;
  }

  return (
    <GarcomLayout>
      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {tables?.map((table) => {
          const hasActiveOrder = activeOrders?.some(o => o.tableId === table.id && o.status !== "finalizado");
          
          return (
            <Link key={table.id} href={`/garcom/pedido/${table.id}`}>
              <div className={`aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-colors cursor-pointer p-2
                ${hasActiveOrder 
                  ? "bg-primary/20 border-primary text-primary-foreground" 
                  : "bg-card border-border hover:bg-accent/10"
                }`}>
                <span className="text-4xl font-bold">{table.number}</span>
                {table.label && <span className="text-sm mt-1 opacity-80 truncate w-full text-center">{table.label}</span>}
                {hasActiveOrder && <span className="text-xs font-bold mt-2 bg-primary text-primary-foreground px-2 py-1 rounded-full">OCUPADA</span>}
              </div>
            </Link>
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
