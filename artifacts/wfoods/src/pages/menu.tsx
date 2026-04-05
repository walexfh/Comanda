import { useParams } from "wouter";
import { useGetPublicMenu, useCreateOrder } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Minus, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

export default function PublicMenu() {
  const { tenantSlug } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const tableParam = searchParams.get("table");
  
  const { data: menu, isLoading } = useGetPublicMenu(tenantSlug!);
  const createOrder = useCreateOrder();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9] text-[#1A1A1A]">Carregando cardápio...</div>;
  }

  if (!menu) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9] text-[#1A1A1A]">Cardápio não encontrado.</div>;
  }

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado!`);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    createOrder.mutate(
      {
        data: {
          tenantSlug: tenantSlug!,
          tableId: tableParam ? parseInt(tableParam) : undefined,
          customerName,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
        }
      },
      {
        onSuccess: () => {
          toast.success("Pedido realizado com sucesso!");
          setCart([]);
          setIsCartOpen(false);
        },
        onError: () => toast.error("Erro ao realizar pedido.")
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFDF9] text-[#1A1A1A] font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#EAE8E1] sticky top-0 z-10 px-4 py-4 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-[#2A7250]">{menu.tenant.name}</h1>
        {tableParam && <div className="text-sm text-[#8B8378] mt-1">Mesa {tableParam}</div>}
      </header>

      {/* Menu Categories & Items */}
      <main className="max-w-2xl mx-auto p-4 space-y-12 mt-6">
        {menu.categories.map(category => {
          const categoryProducts = menu.products.filter(p => p.categoryId === category.id && p.available);
          if (categoryProducts.length === 0) return null;

          return (
            <section key={category.id}>
              <h2 className="text-2xl font-bold mb-6 text-[#2A7250] border-b-2 border-[#EAE8E1] pb-2 inline-block">{category.name}</h2>
              <div className="space-y-6">
                {categoryProducts.map(product => (
                  <div key={product.id} className="flex justify-between items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-[#EAE8E1]">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      {product.description && <p className="text-[#8B8378] text-sm mt-1 leading-relaxed">{product.description}</p>}
                      <div className="font-bold text-[#E67E22] mt-3">{formatCurrency(product.price)}</div>
                    </div>
                    <Button 
                      onClick={() => addToCart(product)}
                      className="bg-[#2A7250] hover:bg-[#1E523A] text-white rounded-full h-10 w-10 p-0 flex-shrink-0 shadow-md"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FDFDF9] via-[#FDFDF9] to-transparent z-20">
          <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
            <DialogTrigger asChild>
              <Button className="w-full max-w-md mx-auto flex justify-between items-center h-14 rounded-full bg-[#E67E22] hover:bg-[#D35400] text-white shadow-xl text-lg px-6 transition-transform active:scale-95">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </div>
                  <span>Ver Pedido</span>
                </div>
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border-[#EAE8E1]">
              <DialogHeader>
                <DialogTitle className="text-[#2A7250] text-xl">Seu Pedido</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
                {cart.map(item => (
                  <div key={item.productId} className="flex justify-between items-center border-b border-[#EAE8E1] pb-4 last:border-0">
                    <div className="flex-1 pr-4">
                      <div className="font-bold">{item.productName}</div>
                      <div className="text-[#E67E22] font-medium mt-1">{formatCurrency(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#FDFDF9] border border-[#EAE8E1] rounded-full px-2 py-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#8B8378]" onClick={() => updateQuantity(item.productId, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#2A7250]" onClick={() => updateQuantity(item.productId, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#EAE8E1] pt-4 space-y-4">
                <div className="flex justify-between items-center font-bold text-xl">
                  <span>Total</span>
                  <span className="text-[#E67E22]">{formatCurrency(cartTotal)}</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#8B8378]">Seu Nome</label>
                  <Input 
                    placeholder="Como devemos te chamar?" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="border-[#EAE8E1] bg-[#FDFDF9] h-12 text-lg"
                  />
                </div>
              </div>
              <DialogFooter className="sm:justify-start pt-2">
                <Button 
                  className="w-full h-14 text-lg font-bold bg-[#2A7250] hover:bg-[#1E523A] text-white rounded-xl"
                  onClick={handleCheckout}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? "Enviando..." : "Confirmar Pedido"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
