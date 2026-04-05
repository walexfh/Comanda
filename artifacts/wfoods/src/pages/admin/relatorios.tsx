import { AdminLayout } from "@/components/admin-layout";
import { useGetTopProducts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function AdminRelatorios() {
  const { data: topProducts, isLoading } = useGetTopProducts();

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Relatórios</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Ranking de itens mais pedidos hoje.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Carregando...</div>
            ) : (
              <div className="space-y-4">
                {topProducts?.map((prod, i) => (
                  <div key={prod.productId} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold">{prod.productName}</div>
                        <div className="text-xs text-muted-foreground">{prod.totalSold} unidades vendidas</div>
                      </div>
                    </div>
                    <div className="font-bold text-accent">
                      {formatCurrency(prod.totalRevenue)}
                    </div>
                  </div>
                ))}
                {(!topProducts || topProducts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum produto vendido hoje.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
