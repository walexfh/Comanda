import { useGetDashboardSummary, useGetOrdersByStatus, useGetTopProducts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Activity } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingSummary ? "..." : formatCurrency(summary?.totalRevenueToday || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingSummary ? "..." : summary?.totalOrdersToday || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingSummary ? "..." : summary?.activeOrders || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {isLoadingSummary ? (
                 <div>Carregando...</div>
               ) : (
                 <>
                   <div className="flex justify-between items-center p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                     <span className="font-medium">Novos</span>
                     <span className="font-bold text-xl">{summary?.ordersByStatus.novo || 0}</span>
                   </div>
                   <div className="flex justify-between items-center p-2 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                     <span className="font-medium">Preparando</span>
                     <span className="font-bold text-xl">{summary?.ordersByStatus.preparando || 0}</span>
                   </div>
                   <div className="flex justify-between items-center p-2 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                     <span className="font-medium">Prontos</span>
                     <span className="font-bold text-xl">{summary?.ordersByStatus.pronto || 0}</span>
                   </div>
                 </>
               )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Método</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               {isLoadingSummary ? (
                 <div>Carregando...</div>
               ) : (
                 <>
                   <div className="flex justify-between items-center">
                     <span className="font-medium text-muted-foreground">Pix</span>
                     <span className="font-bold">{formatCurrency(summary?.revenueByMethod.pix || 0)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="font-medium text-muted-foreground">Cartão</span>
                     <span className="font-bold">{formatCurrency(summary?.revenueByMethod.cartao || 0)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="font-medium text-muted-foreground">Dinheiro</span>
                     <span className="font-bold">{formatCurrency(summary?.revenueByMethod.dinheiro || 0)}</span>
                   </div>
                 </>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
