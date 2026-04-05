import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/index";
import AdminLogin from "@/pages/login/admin";
import WaiterLogin from "@/pages/login/garcom";
import AdminDashboard from "@/pages/admin/index";
import AdminOrders from "@/pages/admin/orders";
import AdminCardapio from "@/pages/admin/cardapio";
import AdminMesas from "@/pages/admin/mesas";
import AdminGarcons from "@/pages/admin/garcons";
import AdminCaixa from "@/pages/admin/caixa";
import AdminRelatorios from "@/pages/admin/relatorios";
import GarcomMesas from "@/pages/garcom/index";
import GarcomPedido from "@/pages/garcom/pedido";
import GarcomFechar from "@/pages/garcom/fechar";
import PublicMenu from "@/pages/menu";
import Cadastro from "@/pages/cadastro";


const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login/admin" component={AdminLogin} />
      <Route path="/login/garcom" component={WaiterLogin} />
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/cardapio" component={AdminCardapio} />
      <Route path="/admin/mesas" component={AdminMesas} />
      <Route path="/admin/garcons" component={AdminGarcons} />
      <Route path="/admin/caixa" component={AdminCaixa} />
      <Route path="/admin/relatorios" component={AdminRelatorios} />
      <Route path="/garcom" component={GarcomMesas} />
      <Route path="/garcom/pedido/:tableId" component={GarcomPedido} />
      <Route path="/garcom/fechar/:tableId" component={GarcomFechar} />
      <Route path="/menu/:tenantSlug" component={PublicMenu} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
