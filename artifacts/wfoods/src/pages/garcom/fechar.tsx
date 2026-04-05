import { GarcomLayout } from "@/components/garcom-layout";
import { useListOrders, useListTables } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer, Receipt } from "lucide-react";
import { useMemo } from "react";

const SERVICE_FEE_RATE = 0.10;

export default function GarcomFecharConta() {
  const { tableId } = useParams();
  const [, setLocation] = useLocation();

  const { data: allOrders, isLoading } = useListOrders({ tableId: parseInt(tableId!) });
  const { data: tables } = useListTables();
  const tableNumber = tables?.find(t => t.id === parseInt(tableId!))?.number ?? tableId;

  const activeOrders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.filter(o => o.status !== "finalizado" && o.status !== "cancelado");
  }, [allOrders]);

  const allItems = useMemo(() => {
    const itemMap = new Map<string, { name: string; quantity: number; unitPrice: number }>();
    for (const order of activeOrders) {
      for (const item of (order.items ?? [])) {
        const key = `${item.productId}`;
        if (itemMap.has(key)) {
          itemMap.get(key)!.quantity += item.quantity;
        } else {
          itemMap.set(key, {
            name: item.productName ?? `Produto #${item.productId}`,
            quantity: item.quantity,
            unitPrice: parseFloat(String(item.unitPrice ?? 0)),
          });
        }
      }
    }
    return Array.from(itemMap.values());
  }, [activeOrders]);

  const subtotal = allItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const totalWithFee = subtotal + serviceFee;

  const now = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handlePrint = () => window.print();

  const title = `Fechar Conta — Mesa ${tableNumber}`;

  if (isLoading) {
    return (
      <GarcomLayout title={title}>
        <div className="p-8 text-center text-muted-foreground">Carregando conta...</div>
      </GarcomLayout>
    );
  }

  if (allItems.length === 0) {
    return (
      <GarcomLayout title={title}>
        <div className="p-8 text-center space-y-4">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum pedido em aberto para esta mesa.</p>
          <Button variant="outline" onClick={() => setLocation("/garcom")}>
            Voltar às Mesas
          </Button>
        </div>
      </GarcomLayout>
    );
  }

  return (
    <>
      {/* Print styles — hide everything except #print-receipt */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-receipt, #print-receipt * { visibility: visible !important; }
          #print-receipt {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            font-family: monospace !important;
            font-size: 12px !important;
            color: #000 !important;
            background: #fff !important;
          }
        }
      `}</style>

      <GarcomLayout title={title}>
        <div className="p-4 max-w-lg mx-auto w-full space-y-4">
          {/* Receipt — visible on screen and printed */}
          <div id="print-receipt" className="bg-card rounded-xl border border-border p-4 font-mono text-sm">
            <div className="text-center border-b border-dashed border-border pb-3 mb-3">
              <div className="font-bold text-lg">COMANDA — MESA {tableNumber}</div>
              <div className="text-muted-foreground text-xs">{now}</div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-dashed border-border">
                  <th className="text-left py-1 font-normal">Produto</th>
                  <th className="text-center py-1 font-normal w-8">Qtd</th>
                  <th className="text-right py-1 font-normal">Valor</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5 pr-2 leading-tight">
                      <div className="font-medium">{item.name}</div>
                    </td>
                    <td className="py-1.5 text-center text-muted-foreground">{item.quantity}x</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-border mt-3 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de serviço ({SERVICE_FEE_RATE * 100}%)</span>
                <span>{formatCurrency(serviceFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                <span>TOTAL</span>
                <span>{formatCurrency(totalWithFee)}</span>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={handlePrint}>
            <Printer className="w-5 h-5" />
            Imprimir Conta
          </Button>
        </div>
      </GarcomLayout>
    </>
  );
}
