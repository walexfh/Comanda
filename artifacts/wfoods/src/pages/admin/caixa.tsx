import { AdminLayout } from "@/components/admin-layout";
import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export default function AdminCaixa() {
  const { data: payments, isLoading } = useListPayments();

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Caixa</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos de Hoje</CardTitle>
          <CardDescription>Histórico de transações registradas no caixa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Carregando...</div>
          ) : (
            <div className="space-y-4">
              {payments?.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div>
                    <div className="font-bold text-lg">{formatCurrency(payment.amount)}</div>
                    <div className="text-sm text-muted-foreground">Pedido #{payment.orderId} • {format(new Date(payment.createdAt), "HH:mm")}</div>
                  </div>
                  <div className="capitalize font-medium text-primary">
                    {payment.method}
                  </div>
                </div>
              ))}
              {(!payments || payments.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento registrado hoje.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
