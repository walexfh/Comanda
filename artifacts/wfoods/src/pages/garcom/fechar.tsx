import { GarcomLayout } from "@/components/garcom-layout";
import { useListOrders, useListTables, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer, Receipt, CreditCard, Banknote, Smartphone, CheckCircle2, Clock, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const SERVICE_FEE_RATE = 0.10;
const PICKUP_THRESHOLD = 80; // Tables above this number are pickup orders (no service fee)

const PAYMENT_METHODS = [
  { id: "cartao", label: "Cartão", icon: CreditCard, color: "text-blue-500 border-blue-500/30 hover:bg-blue-500/10" },
  { id: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-green-500 border-green-500/30 hover:bg-green-500/10" },
  { id: "pix", label: "Pix", icon: Smartphone, color: "text-violet-500 border-violet-500/30 hover:bg-violet-500/10" },
];

export default function GarcomFecharConta() {
  const { tableId } = useParams();
  const [, setLocation] = useLocation();
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const { data: allOrders, isLoading } = useListOrders({ tableId: parseInt(tableId!) });
  const { data: tables } = useListTables();
  const updateStatus = useUpdateOrderStatus();

  const tableNumber = tables?.find(t => t.id === parseInt(tableId!))?.number ?? tableId;
  const isPickup = typeof tableNumber === "number" && tableNumber > PICKUP_THRESHOLD;

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
  const serviceFee = isPickup ? 0 : subtotal * SERVICE_FEE_RATE;
  const totalWithFee = subtotal + serviceFee;

  const now = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handlePrint = () => window.print();

  const handlePayment = async (method: string) => {
    if (paying || done) return;
    setPaying(true);
    try {
      const token = localStorage.getItem("wfoods_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const base = import.meta.env.BASE_URL ?? "/";

      await Promise.all(
        activeOrders.map(order =>
          updateStatus.mutateAsync({ orderId: order.id, data: { status: "finalizado" } })
        )
      );

      await fetch(`${base}api/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orderId: activeOrders[0]?.id,
          amount: totalWithFee,
          method,
        }),
      });

      await fetch(`${base}api/tables/${tableId}/close-receipt`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tableNumber,
          method,
          items: allItems,
          subtotal,
          serviceFee,
          total: totalWithFee,
          timestamp: new Date().toISOString(),
        }),
      });

      setDone(true);
      toast.success("Pagamento finalizado! Mesa liberada.");
      setTimeout(() => setLocation("/garcom"), 1800);
    } catch {
      toast.error("Erro ao finalizar pagamento. Tente novamente.");
    } finally {
      setPaying(false);
    }
  };

  const title = isPickup ? `Fechar Conta — Retirada #${tableNumber}` : `Fechar Conta — Mesa ${tableNumber}`;

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

  if (done) {
    return (
      <GarcomLayout title={title}>
        <div className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
          <h2 className="text-xl font-bold">Pagamento Confirmado!</h2>
          <p className="text-muted-foreground">Mesa {tableNumber} liberada.</p>
        </div>
      </GarcomLayout>
    );
  }

  return (
    <>
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

          {/* Receipt */}
          <div id="print-receipt" className="bg-card rounded-xl border border-border p-4 font-mono text-sm">
            <div className="text-center border-b border-dashed border-border pb-3 mb-3">
              <div className="font-bold text-lg">
                {isPickup ? `RETIRADA #${tableNumber}` : `COMANDA — MESA ${tableNumber}`}
              </div>
              <div className="text-muted-foreground text-xs">{now}</div>
              {isPickup && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 border border-blue-400 text-blue-500 rounded-full px-3 py-0.5 text-xs font-semibold">
                  <ShoppingBag className="w-3 h-3" />
                  PEDIDO PARA RETIRADA
                </div>
              )}
              <div className="mt-2 inline-flex items-center gap-1.5 border border-amber-400 text-amber-600 rounded-full px-3 py-0.5 text-xs font-semibold">
                <Clock className="w-3 h-3" />
                AGUARDANDO PAGAMENTO
              </div>
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
              {isPickup ? (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-500 font-medium">Retirada — Sem taxa de serviço</span>
                  <span className="text-blue-500">–</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de serviço ({SERVICE_FEE_RATE * 100}%)</span>
                  <span>{formatCurrency(serviceFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                <span>TOTAL</span>
                <span>{formatCurrency(totalWithFee)}</span>
              </div>
            </div>
          </div>

          {/* Print button */}
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Imprimir Conta
          </Button>

          {/* Payment method selection */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wide">
              Forma de Pagamento
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  disabled={paying}
                  onClick={() => handlePayment(id)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 py-5 font-semibold transition-all active:scale-95 disabled:opacity-50 ${color}`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Selecione a forma de pagamento para finalizar e liberar a mesa
          </p>
        </div>
      </GarcomLayout>
    </>
  );
}
